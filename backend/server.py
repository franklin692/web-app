from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta, date, time
from typing import Optional, Annotated
from zoneinfo import ZoneInfo

import bcrypt
import jwt
import requests
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Response
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from seed import build_seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cosafare")

client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

ROME = ZoneInfo("Europe/Rome")
KINDS = {"event", "venue", "place", "activity"}
SPOT_TAGS = {"unibas", "mcdonalds", "centro", "trasporti", "locali", "altro"}
REACTIONS = {"heart", "eyes", "fire"}
JWT_ALG = "HS256"


def now_utc():
    return datetime.now(timezone.utc)


def iso_now():
    return now_utc().isoformat()


# ---------- Mongo models ----------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self):
        return self.model_dump(exclude={"id"})


class Item(BaseDocument):
    kind: str
    title: str
    category: str = ""
    town: str = "Potenza"
    zone: str = ""
    description: str = ""
    image_url: str = ""
    instagram: str = ""
    info_link: str = ""
    address: str = ""
    opening_hours: str = ""
    start_date: str = ""
    start_time: str = ""
    end_time: str = ""
    price: str = ""
    status: str = "pending"
    featured: bool = False
    boost: int = 0
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=iso_now)


class Spotted(BaseDocument):
    where: str
    when: str = ""
    who: str = ""
    message: str
    tag: str = "altro"
    status: str = "pending"
    reactions: dict = Field(default_factory=lambda: {"heart": 0, "eyes": 0, "fire": 0})
    owner_user: Optional[str] = None
    owner_code: Optional[str] = None
    created_at: str = Field(default_factory=iso_now)


class User(BaseDocument):
    username: str
    email: str
    password_hash: str
    role: str = "user"
    created_at: str = Field(default_factory=iso_now)


S = lambda n: Field(default="", max_length=n)


class ItemIn(BaseModel):
    kind: str
    title: str = Field(min_length=2, max_length=140)
    category: str = S(60)
    town: str = Field(default="Potenza", max_length=60)
    zone: str = S(80)
    description: str = S(2000)
    image_url: str = S(600)
    instagram: str = S(300)
    info_link: str = S(300)
    address: str = S(200)
    opening_hours: str = S(150)
    start_date: str = S(10)
    start_time: str = S(5)
    end_time: str = S(5)
    price: str = S(120)


class SpottedIn(BaseModel):
    where: str = Field(min_length=2, max_length=140)
    when: str = S(80)
    who: str = S(300)
    message: str = Field(min_length=3, max_length=1500)
    tag: str = "altro"


class VoteIn(BaseModel):
    type: str


class ReactIn(BaseModel):
    type: str


class ReplyIn(BaseModel):
    message: str = Field(min_length=2, max_length=1000)
    contact: str = Field(min_length=2, max_length=150)


class CodeIn(BaseModel):
    code: str


class RegisterIn(BaseModel):
    username: str
    email: str
    password: str


class LoginIn(BaseModel):
    identifier: str
    password: str


class PinIn(BaseModel):
    pin: str


class StatusIn(BaseModel):
    status: str


class BoostIn(BaseModel):
    amount: int


class SettingsIn(BaseModel):
    threshold: Optional[int] = None
    new_pin: Optional[str] = None


# ---------- helpers ----------
def oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(404, "Elemento non trovato")


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def check_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(sub: str, role: str, typ: str, hours: int, **extra) -> str:
    payload = {"sub": sub, "role": role, "type": typ, "exp": now_utc() + timedelta(hours=hours), **extra}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def decode_bearer(request: Request):
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        return None
    try:
        return jwt.decode(h[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None


def user_out(u: User):
    return {"id": u.id, "username": u.username, "email": u.email, "role": u.role}


async def get_settings():
    return await db.settings.find_one({"_id": "global"}) or {}


async def get_identity(request: Request):
    p = decode_bearer(request)
    if p and p.get("type") == "access":
        try:
            u = User.from_mongo(await db.users.find_one({"_id": ObjectId(p["sub"])}))
        except Exception:
            u = None
        if u:
            return {"user": u, "voter": f"u:{u.id}"}
    dev = re.sub(r"[^a-zA-Z0-9\-]", "", request.headers.get("X-Device-Id", ""))[:64]
    return {"user": None, "voter": f"d:{dev}" if dev else None}


def client_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")


def safe_url(v: str) -> str:
    v = (v or "").strip()
    if not v or v.startswith("/api/files/") or re.match(r"^https?://", v, re.I):
        return v
    return "https://" + v.lstrip("/")


def need_voter(ident):
    if not ident["voter"]:
        raise HTTPException(400, "Dispositivo non riconosciuto")
    return ident["voter"]


async def require_user(request: Request) -> User:
    ident = await get_identity(request)
    if not ident["user"]:
        raise HTTPException(401, "Accesso richiesto")
    return ident["user"]


async def require_admin(request: Request):
    p = decode_bearer(request)
    if not p:
        raise HTTPException(401, "Accesso admin richiesto")
    if p.get("type") == "pin" and p.get("role") == "admin":
        st = await get_settings()
        if p.get("pv") == st.get("pin_version", 1):
            return p
    if p.get("type") == "access":
        try:
            u = await db.users.find_one({"_id": ObjectId(p["sub"])})
        except Exception:
            u = None
        if u and u.get("role") == "admin":
            return p
    raise HTTPException(401, "Accesso admin richiesto")


async def check_lock(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("locked_until") and rec["locked_until"] > now_utc():
        raise HTTPException(429, "Troppi tentativi. Riprova tra 15 minuti.")


async def register_fail(identifier: str):
    rec = await db.login_attempts.find_one_and_update(
        {"identifier": identifier}, {"$inc": {"count": 1}}, upsert=True, return_document=True)
    if rec and rec.get("count", 0) >= 5:
        await db.login_attempts.update_one({"identifier": identifier},
                                           {"$set": {"count": 0, "locked_until": now_utc() + timedelta(minutes=15)}})


def _t(s: str):
    try:
        return time.fromisoformat(s) if s else None
    except ValueError:
        return None


def event_window(it: Item):
    try:
        d = date.fromisoformat(it.start_date)
    except ValueError:
        return None, None
    start = datetime.combine(d, _t(it.start_time) or time(20, 0), tzinfo=ROME)
    et = _t(it.end_time)
    if et:
        end = datetime.combine(d, et, tzinfo=ROME)
        if end <= start:
            end += timedelta(days=1)
    else:
        end = start + timedelta(hours=6)
    return start, end


def is_expired(it: Item) -> bool:
    if it.kind != "event":
        return False
    _, end = event_window(it)
    return bool(end and end < datetime.now(ROME))


def weekend_range(today: date):
    wd = today.weekday()
    fri = today - timedelta(days=wd - 4) if wd >= 4 else today + timedelta(days=4 - wd)
    return fri, fri + timedelta(days=2)


def level(score: int) -> int:
    if score <= 0:
        return 0
    if score <= 5:
        return 1
    if score <= 19:
        return 2
    if score <= 49:
        return 3
    return 4


def validate_item(data: dict):
    if data["kind"] not in KINDS:
        raise HTTPException(422, "Tipo non valido")
    for f in ("instagram", "info_link", "image_url"):
        data[f] = safe_url(data.get(f, ""))
    if data["kind"] == "event":
        try:
            date.fromisoformat(data.get("start_date") or "")
        except ValueError:
            raise HTTPException(422, "La data è obbligatoria per gli eventi")


async def vote_counts(ids):
    out = {}
    pipeline = [{"$match": {"item_id": {"$in": ids}, "expires_at": {"$gt": now_utc()}}},
                {"$group": {"_id": {"i": "$item_id", "t": "$type"}, "n": {"$sum": 1}}}]
    async for r in db.votes.aggregate(pipeline):
        out.setdefault(r["_id"]["i"], {"going": 0, "here": 0})[r["_id"]["t"]] = r["n"]
    return out


async def present(items, ident=None, admin=False):
    ids = [i.id for i in items]
    counts = await vote_counts(ids)
    thr = (await get_settings()).get("threshold", 20)
    my_votes, saved = {}, set()
    voter = ident and ident["voter"]
    if voter:
        async for v in db.votes.find({"voter": voter, "item_id": {"$in": ids}, "expires_at": {"$gt": now_utc()}}):
            my_votes[v["item_id"]] = v["type"]
        async for s in db.saves.find({"voter": voter, "item_id": {"$in": ids}}):
            saved.add(s["item_id"])
    now_r = datetime.now(ROME)
    fri, sun = weekend_range(now_r.date())
    res = []
    for it in items:
        c = counts.get(it.id, {"going": 0, "here": 0})
        score = c["going"] + c["here"] + it.boost
        d = it.model_dump()
        created_by = d.pop("created_by", None)
        d.update(level=level(score), display_count=score if score > 0 and score >= thr else None,
                 my_vote=my_votes.get(it.id), saved=it.id in saved, _score=score, _tonight=True, _weekend=True)
        if it.kind == "event":
            s, e = event_window(it)
            if s:
                live = s <= now_r <= e
                d.update(start_iso=s.isoformat(), end_iso=e.isoformat(), live=live,
                         _tonight=s.date() == now_r.date() or live,
                         _weekend=fri <= s.date() <= sun or (live and now_r.weekday() >= 4))
        if admin:
            d.update(going=c["going"], here=c["here"], score=score, created_by=created_by,
                     expired=is_expired(it))
        res.append(d)
    return res


def clean(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


async def load_public_items():
    docs = await db.items.find({"status": "approved"}).to_list(2000)
    return [i for i in (Item.from_mongo(d) for d in docs) if not is_expired(i)]


def spotted_public(s: Spotted, mine=None):
    d = s.model_dump(exclude={"owner_user", "owner_code"})
    d["my_reactions"] = mine or []
    return d


# ---------- object storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "cosafare-potenza"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    for attempt in range(2):
        key = init_storage(force=attempt == 1)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.json()


def get_object(path: str):
    for attempt in range(2):
        key = init_storage(force=attempt == 1)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- public routes ----------
@api.get("/")
async def root():
    return {"message": "Cosa Fare a Potenza API"}


@api.get("/home")
async def home(request: Request):
    ident = await get_identity(request)
    pres = await present(await load_public_items(), ident)
    featured = sorted([p for p in pres if p["featured"]], key=lambda p: (p["kind"] != "event", p.get("start_iso", "")))
    trending = [p for p in pres if (p["kind"] == "event" and p["_tonight"]) or (p["kind"] != "event" and p["_score"] > 0)]
    trending.sort(key=lambda p: (-p["_score"], not p.get("live", False)))
    st = await get_settings()
    return {"featured": [clean(p) for p in featured], "trending": [clean(p) for p in trending[:10]],
            "threshold": st.get("threshold", 20)}


@api.get("/items")
async def list_items(request: Request, kind: str = "", when: str = "all", q: str = ""):
    ident = await get_identity(request)
    pres = await present(await load_public_items(), ident)
    if kind in KINDS:
        pres = [p for p in pres if p["kind"] == kind]
    if when == "tonight":
        pres = [p for p in pres if p["_tonight"]]
    elif when == "weekend":
        pres = [p for p in pres if p["_weekend"]]
    q = q.strip().lower()
    if q:
        fields = ("title", "description", "zone", "town", "category", "address")
        pres = [p for p in pres if any(q in (p.get(f) or "").lower() for f in fields)]
    pres.sort(key=lambda p: (-p["_score"], p["title"].lower()))
    return [clean(p) for p in pres]


async def get_public_item(item_id: str) -> Item:
    it = Item.from_mongo(await db.items.find_one({"_id": oid(item_id), "status": "approved"}))
    if not it or is_expired(it):
        raise HTTPException(404, "Elemento non trovato")
    return it


@api.get("/items/{item_id}")
async def get_item(item_id: str, request: Request):
    it = await get_public_item(item_id)
    return clean((await present([it], await get_identity(request)))[0])


@api.post("/items/{item_id}/vote")
async def vote(item_id: str, body: VoteIn, request: Request):
    if body.type not in ("going", "here"):
        raise HTTPException(422, "Voto non valido")
    ident = await get_identity(request)
    voter = need_voter(ident)
    it = await get_public_item(item_id)
    now = now_utc()
    existing = await db.votes.find_one({"item_id": it.id, "voter": voter})
    if existing and existing["expires_at"] > now and existing["type"] == body.type:
        await db.votes.delete_one({"_id": existing["_id"]})
    else:
        if body.type == "here":
            exp = now + timedelta(hours=4)
        else:
            exp = now + timedelta(hours=12)
            if it.kind == "event":
                _, end = event_window(it)
                if end:
                    exp = max(now + timedelta(minutes=5), end.astimezone(timezone.utc))
        await db.votes.update_one({"item_id": it.id, "voter": voter},
                                  {"$set": {"type": body.type, "expires_at": exp, "updated_at": now}}, upsert=True)
    return clean((await present([it], ident))[0])


@api.post("/items/{item_id}/save")
async def save_item(item_id: str, request: Request):
    ident = await get_identity(request)
    voter = need_voter(ident)
    it = await get_public_item(item_id)
    res = await db.saves.delete_one({"item_id": it.id, "voter": voter})
    if res.deleted_count == 0:
        await db.saves.insert_one({"item_id": it.id, "voter": voter, "created_at": iso_now()})
    return clean((await present([it], ident))[0])


@api.post("/submissions/item")
async def submit_item(body: ItemIn, request: Request):
    ident = await get_identity(request)
    data = body.model_dump()
    validate_item(data)
    it = Item(**data, status="pending", created_by=ident["voter"])
    await db.items.insert_one(it.to_mongo())
    return {"ok": True}


@api.post("/submissions/spotted")
async def submit_spotted(body: SpottedIn, request: Request):
    ident = await get_identity(request)
    data = body.model_dump()
    if data["tag"] not in SPOT_TAGS:
        data["tag"] = "altro"
    code = None
    if not ident["user"]:
        code = "SPOT-" + secrets.token_hex(3).upper()
    sp = Spotted(**data, status="pending", owner_user=ident["user"].id if ident["user"] else None, owner_code=code)
    await db.spotted.insert_one(sp.to_mongo())
    return {"ok": True, "code": code}


@api.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(422, "Carica solo immagini")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Immagine troppo grande (max 8MB)")
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()[:5] or "jpg"
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(502, "Caricamento non riuscito, riprova o usa un link")
    await db.files.insert_one({"storage_path": result["path"], "original_filename": file.filename,
                               "content_type": file.content_type, "size": result.get("size"),
                               "is_deleted": False, "created_at": iso_now()})
    return {"url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def download(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File non trovato")
    data, ct = await run_in_threadpool(get_object, path)
    return Response(content=data, media_type=rec.get("content_type") or ct,
                    headers={"Cache-Control": "public, max-age=604800"})


# ---------- spotted ----------
async def my_reactions(voter, ids):
    out = {}
    if voter:
        async for r in db.spotted_reactions.find({"voter": voter, "spotted_id": {"$in": ids}}):
            out.setdefault(r["spotted_id"], []).append(r["type"])
    return out


@api.get("/spotted")
async def list_spotted(request: Request, tag: str = ""):
    ident = await get_identity(request)
    query = {"status": "approved"}
    if tag in SPOT_TAGS:
        query["tag"] = tag
    items = [Spotted.from_mongo(d) for d in await db.spotted.find(query).sort("created_at", -1).to_list(500)]
    mine = await my_reactions(ident["voter"], [s.id for s in items])
    return [spotted_public(s, mine.get(s.id)) for s in items]


@api.get("/spotted/{sid}")
async def get_spotted(sid: str, request: Request):
    ident = await get_identity(request)
    s = Spotted.from_mongo(await db.spotted.find_one({"_id": oid(sid), "status": "approved"}))
    if not s:
        raise HTTPException(404, "Spotted non trovato")
    mine = await my_reactions(ident["voter"], [s.id])
    return spotted_public(s, mine.get(s.id))


@api.post("/spotted/{sid}/react")
async def react(sid: str, body: ReactIn, request: Request):
    if body.type not in REACTIONS:
        raise HTTPException(422, "Reazione non valida")
    ident = await get_identity(request)
    voter = need_voter(ident)
    s = Spotted.from_mongo(await db.spotted.find_one({"_id": oid(sid), "status": "approved"}))
    if not s:
        raise HTTPException(404, "Spotted non trovato")
    res = await db.spotted_reactions.delete_one({"spotted_id": s.id, "voter": voter, "type": body.type})
    inc = -1 if res.deleted_count else 1
    if inc == 1:
        try:
            await db.spotted_reactions.insert_one({"spotted_id": s.id, "voter": voter, "type": body.type})
        except DuplicateKeyError:
            inc = 0
    if inc:
        await db.spotted.update_one({"_id": ObjectId(s.id)}, {"$inc": {f"reactions.{body.type}": inc}})
    s = Spotted.from_mongo(await db.spotted.find_one({"_id": ObjectId(s.id)}))
    mine = await my_reactions(voter, [s.id])
    return spotted_public(s, mine.get(s.id))


@api.post("/spotted/{sid}/reply")
async def reply(sid: str, body: ReplyIn, request: Request):
    ident = await get_identity(request)
    s = await db.spotted.find_one({"_id": oid(sid), "status": "approved"})
    if not s:
        raise HTTPException(404, "Spotted non trovato")
    await db.spotted_replies.insert_one({"spotted_id": str(s["_id"]), "message": body.message.strip(),
                                         "contact": body.contact.strip(), "voter": ident["voter"],
                                         "created_at": iso_now()})
    return {"ok": True}


async def replies_for(sid: str):
    docs = await db.spotted_replies.find({"spotted_id": sid}).sort("created_at", -1).to_list(500)
    return [{"id": str(d["_id"]), "message": d["message"], "contact": d["contact"], "created_at": d["created_at"]}
            for d in docs]


@api.post("/spotted-code")
async def spotted_by_code(body: CodeIn, request: Request):
    key = f"code:{client_ip(request)}"
    await check_lock(key)
    code = body.code.strip().upper()
    s = Spotted.from_mongo(await db.spotted.find_one({"owner_code": code})) if code else None
    if not s:
        await register_fail(key)
        raise HTTPException(404, "Codice non valido")
    return {"spotted": spotted_public(s), "replies": await replies_for(s.id)}


# ---------- auth ----------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]{3,30}$")


@api.post("/auth/register")
async def register(body: RegisterIn):
    username, email = body.username.strip(), body.email.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(422, "Username: 3–30 caratteri tra lettere, numeri, _ e .")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(422, "Email non valida")
    if len(body.password) < 6:
        raise HTTPException(422, "La password deve avere almeno 6 caratteri")
    if await db.users.find_one({"$or": [{"email": email}, {"username_lower": username.lower()}]}):
        raise HTTPException(409, "Username o email già registrati")
    u = User(username=username, email=email, password_hash=hash_pw(body.password))
    doc = u.to_mongo()
    doc["username_lower"] = username.lower()
    res = await db.users.insert_one(doc)
    u.id = str(res.inserted_id)
    return {"token": make_token(u.id, u.role, "access", 24 * 30), "user": user_out(u)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    ident = body.identifier.strip().lower()
    key = f"{client_ip(request)}:{ident}"
    await check_lock(key)
    u = User.from_mongo(await db.users.find_one({"$or": [{"email": ident}, {"username_lower": ident}]}))
    if not u or not check_pw(body.password, u.password_hash):
        await register_fail(key)
        raise HTTPException(401, "Credenziali non valide")
    await db.login_attempts.delete_one({"identifier": key})
    return {"token": make_token(u.id, u.role, "access", 24 * 30), "user": user_out(u)}


@api.get("/auth/me")
async def me(user: User = Depends(require_user)):
    return user_out(user)


@api.get("/me/saved")
async def my_saved(request: Request):
    ident = await get_identity(request)
    voter = need_voter(ident)
    ids = [s["item_id"] async for s in db.saves.find({"voter": voter}).sort("created_at", -1)]
    docs = await db.items.find({"_id": {"$in": [ObjectId(i) for i in ids]}, "status": "approved"}).to_list(500)
    items = [i for i in (Item.from_mongo(d) for d in docs) if not is_expired(i)]
    return [clean(p) for p in await present(items, ident)]


@api.get("/me/spotted")
async def my_spotted(user: User = Depends(require_user)):
    out = []
    async for d in db.spotted.find({"owner_user": user.id}).sort("created_at", -1):
        s = Spotted.from_mongo(d)
        out.append({**spotted_public(s), "replies": await replies_for(s.id)})
    return out


@api.get("/me/submissions")
async def my_submissions(user: User = Depends(require_user)):
    out = []
    async for d in db.items.find({"created_by": f"u:{user.id}"}):
        it = Item.from_mongo(d)
        out.append({"id": it.id, "type": "item", "kind": it.kind, "title": it.title, "status": it.status,
                    "created_at": it.created_at})
    async for d in db.spotted.find({"owner_user": user.id}):
        s = Spotted.from_mongo(d)
        out.append({"id": s.id, "type": "spotted", "kind": "spotted", "title": s.where, "status": s.status,
                    "created_at": s.created_at})
    out.sort(key=lambda x: x["created_at"], reverse=True)
    return out


# ---------- admin ----------
@api.post("/admin/pin")
async def admin_pin(body: PinIn, request: Request):
    key = f"pin:{client_ip(request)}"
    await check_lock(key)
    st = await get_settings()
    if not check_pw(body.pin, st.get("admin_pin_hash", "")):
        await register_fail(key)
        raise HTTPException(401, "PIN non corretto")
    await db.login_attempts.delete_one({"identifier": key})
    return {"token": make_token("pin-admin", "admin", "pin", 24, pv=st.get("pin_version", 1))}


@api.get("/admin/check")
async def admin_check(_=Depends(require_admin)):
    return {"ok": True}


@api.get("/admin/pending")
async def admin_pending(_=Depends(require_admin)):
    items = [Item.from_mongo(d) for d in await db.items.find({"status": "pending"}).sort("created_at", -1).to_list(500)]
    sps = [Spotted.from_mongo(d) for d in await db.spotted.find({"status": "pending"}).sort("created_at", -1).to_list(500)]
    return {"items": [clean(p) for p in await present(items, admin=True)],
            "spotted": [s.model_dump(exclude={"owner_code"}) for s in sps]}


@api.get("/admin/items")
async def admin_items(kind: str = "", status: str = "approved", _=Depends(require_admin)):
    query = {}
    if kind in KINDS:
        query["kind"] = kind
    if status in ("approved", "pending", "rejected"):
        query["status"] = status
    items = [Item.from_mongo(d) for d in await db.items.find(query).sort("created_at", -1).to_list(2000)]
    return [clean(p) for p in await present(items, admin=True)]


async def admin_item_out(item_id: str):
    it = Item.from_mongo(await db.items.find_one({"_id": oid(item_id)}))
    if not it:
        raise HTTPException(404, "Elemento non trovato")
    return clean((await present([it], admin=True))[0])


@api.post("/admin/items")
async def admin_create_item(body: ItemIn, _=Depends(require_admin)):
    data = body.model_dump()
    validate_item(data)
    res = await db.items.insert_one(Item(**data, status="approved", created_by="admin").to_mongo())
    return await admin_item_out(str(res.inserted_id))


@api.put("/admin/items/{item_id}")
async def admin_update_item(item_id: str, body: ItemIn, _=Depends(require_admin)):
    data = body.model_dump()
    validate_item(data)
    res = await db.items.update_one({"_id": oid(item_id)}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(404, "Elemento non trovato")
    return await admin_item_out(item_id)


@api.post("/admin/items/{item_id}/status")
async def admin_item_status(item_id: str, body: StatusIn, _=Depends(require_admin)):
    if body.status not in ("approved", "pending", "rejected"):
        raise HTTPException(422, "Stato non valido")
    await db.items.update_one({"_id": oid(item_id)}, {"$set": {"status": body.status}})
    return await admin_item_out(item_id)


@api.post("/admin/items/{item_id}/feature")
async def admin_item_feature(item_id: str, _=Depends(require_admin)):
    it = await db.items.find_one({"_id": oid(item_id)})
    if not it:
        raise HTTPException(404, "Elemento non trovato")
    await db.items.update_one({"_id": it["_id"]}, {"$set": {"featured": not it.get("featured", False)}})
    return await admin_item_out(item_id)


@api.post("/admin/items/{item_id}/boost")
async def admin_item_boost(item_id: str, body: BoostIn, _=Depends(require_admin)):
    update = {"$set": {"boost": 0}} if body.amount == 0 else {"$inc": {"boost": max(-100, min(body.amount, 500))}}
    res = await db.items.update_one({"_id": oid(item_id)}, update)
    if not res.matched_count:
        raise HTTPException(404, "Elemento non trovato")
    await db.items.update_one({"_id": oid(item_id), "boost": {"$lt": 0}}, {"$set": {"boost": 0}})
    return await admin_item_out(item_id)


@api.delete("/admin/items/{item_id}")
async def admin_delete_item(item_id: str, _=Depends(require_admin)):
    await db.items.delete_one({"_id": oid(item_id)})
    await db.votes.delete_many({"item_id": item_id})
    await db.saves.delete_many({"item_id": item_id})
    return {"ok": True}


@api.get("/admin/spotted")
async def admin_spotted(status: str = "", _=Depends(require_admin)):
    query = {"status": status} if status in ("approved", "pending", "rejected") else {}
    docs = await db.spotted.find(query).sort("created_at", -1).to_list(1000)
    out = []
    for d in docs:
        s = Spotted.from_mongo(d)
        out.append({**s.model_dump(exclude={"owner_code"}),
                    "reply_count": await db.spotted_replies.count_documents({"spotted_id": s.id})})
    return out


@api.post("/admin/spotted")
async def admin_create_spotted(body: SpottedIn, _=Depends(require_admin)):
    data = body.model_dump()
    if data["tag"] not in SPOT_TAGS:
        data["tag"] = "altro"
    res = await db.spotted.insert_one(Spotted(**data, status="approved").to_mongo())
    return {"id": str(res.inserted_id)}


@api.put("/admin/spotted/{sid}")
async def admin_update_spotted(sid: str, body: SpottedIn, _=Depends(require_admin)):
    data = body.model_dump()
    if data["tag"] not in SPOT_TAGS:
        data["tag"] = "altro"
    res = await db.spotted.update_one({"_id": oid(sid)}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(404, "Spotted non trovato")
    return {"ok": True}


@api.post("/admin/spotted/{sid}/status")
async def admin_spotted_status(sid: str, body: StatusIn, _=Depends(require_admin)):
    if body.status not in ("approved", "pending", "rejected"):
        raise HTTPException(422, "Stato non valido")
    res = await db.spotted.update_one({"_id": oid(sid)}, {"$set": {"status": body.status}})
    if not res.matched_count:
        raise HTTPException(404, "Spotted non trovato")
    return {"ok": True}


@api.delete("/admin/spotted/{sid}")
async def admin_delete_spotted(sid: str, _=Depends(require_admin)):
    await db.spotted.delete_one({"_id": oid(sid)})
    await db.spotted_replies.delete_many({"spotted_id": sid})
    await db.spotted_reactions.delete_many({"spotted_id": sid})
    return {"ok": True}


@api.get("/admin/replies")
async def admin_replies(_=Depends(require_admin)):
    docs = await db.spotted_replies.find().sort("created_at", -1).to_list(1000)
    sp_ids = list({d["spotted_id"] for d in docs})
    sps = {str(s["_id"]): s async for s in db.spotted.find({"_id": {"$in": [ObjectId(i) for i in sp_ids]}})}
    return [{"id": str(d["_id"]), "spotted_id": d["spotted_id"], "message": d["message"], "contact": d["contact"],
             "created_at": d["created_at"], "spotted_where": sps.get(d["spotted_id"], {}).get("where", "(eliminato)"),
             "spotted_who": sps.get(d["spotted_id"], {}).get("who", "")} for d in docs]


@api.get("/admin/settings")
async def admin_get_settings(_=Depends(require_admin)):
    return {"threshold": (await get_settings()).get("threshold", 20)}


@api.put("/admin/settings")
async def admin_put_settings(body: SettingsIn, _=Depends(require_admin)):
    upd = {}
    if body.threshold is not None:
        if not 1 <= body.threshold <= 1000:
            raise HTTPException(422, "La soglia deve essere tra 1 e 1000")
        upd["threshold"] = body.threshold
    inc = {}
    if body.new_pin:
        if len(body.new_pin) < 4:
            raise HTTPException(422, "Il PIN deve avere almeno 4 caratteri")
        upd["admin_pin_hash"] = hash_pw(body.new_pin)
        inc = {"pin_version": 1}
    op = {"$set": upd}
    if inc:
        op["$inc"] = inc
    if upd:
        await db.settings.update_one({"_id": "global"}, op, upsert=True)
    return {"threshold": (await get_settings()).get("threshold", 20), "pin_changed": bool(inc)}


# ---------- startup ----------
async def seed_all():
    if not await db.settings.find_one({"_id": "global"}):
        await db.settings.insert_one({"_id": "global", "threshold": 20, "pin_version": 1,
                                      "admin_pin_hash": hash_pw(os.environ["ADMIN_PIN"])})
    a_user, a_email, a_pw = os.environ["ADMIN_USERNAME"], os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"username_lower": a_user.lower()})
    if not existing:
        doc = User(username=a_user, email=a_email, password_hash=hash_pw(a_pw), role="admin").to_mongo()
        doc["username_lower"] = a_user.lower()
        await db.users.insert_one(doc)
    elif not check_pw(a_pw, existing["password_hash"]) or existing.get("role") != "admin":
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": hash_pw(a_pw), "role": "admin"}})
    if await db.items.count_documents({}) == 0:
        items, spotteds = build_seed(datetime.now(ROME).date())
        await db.items.insert_many([Item(**i).to_mongo() for i in items])
        await db.spotted.insert_many([Spotted(**s).to_mongo() for s in spotteds])
        logger.info("Seed data inserted")


@app.on_event("startup")
async def startup():
    await db.users.create_index("username_lower", unique=True)
    await db.users.create_index("email", unique=True)
    await db.votes.create_index([("item_id", 1), ("voter", 1)], unique=True)
    await db.votes.create_index("expires_at", expireAfterSeconds=0)
    await db.saves.create_index([("item_id", 1), ("voter", 1)], unique=True)
    await db.spotted_reactions.create_index([("spotted_id", 1), ("voter", 1), ("type", 1)], unique=True)
    await db.login_attempts.create_index("identifier")
    await seed_all()
    try:
        await run_in_threadpool(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
