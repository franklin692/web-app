from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import json
import base64
import asyncio
import httpx
import copy
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta, date, time
from typing import Optional, Annotated
from zoneinfo import ZoneInfo

import bcrypt
import jwt
import requests
from bson import ObjectId, json_util
from pymongo.errors import DuplicateKeyError
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Response
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

from seed import build_seed
from seed2 import DEFAULT_THEMES, DEFAULT_CONFIG, DEFAULT_CATEGORIES, DEFAULT_SECTIONS, SPOT_TAG_MAP, seed_posts, seed_poll

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cosafare")

client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

ROME = ZoneInfo("Europe/Rome")
KINDS = {"event", "venue", "place", "activity"}
DATED = {"event"}
HIDDEN_CATS = set()
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
    reject_reason: str = ""
    featured: bool = False
    boost: int = 0
    themes: list = Field(default_factory=list)
    ai_review: dict = Field(default_factory=dict)
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
    blocked: bool = False
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
    themes: list[str] = Field(default_factory=list, max_length=12)


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
    reason: str = ""


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
    return {"id": u.id, "username": u.username, "email": u.email, "role": u.role, "blocked": u.blocked}


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
    u = None
    if p and p.get("type") == "access":
        try:
            u = await db.users.find_one({"_id": ObjectId(p["sub"])})
        except Exception:
            u = None
    if not u or u.get("role") not in ("admin", "superadmin") or u.get("blocked"):
        raise HTTPException(401, "Accesso admin richiesto")
    return u


async def require_member(request: Request) -> User:
    u = await require_user(request)
    if u.blocked:
        raise HTTPException(403, "Il tuo account è sospeso")
    return u


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
    if it.kind not in DATED:
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


async def clean_themes(data: dict):
    valid = {t["slug"] async for t in db.themes.find({}, {"slug": 1})}
    data["themes"] = [t for t in dict.fromkeys(data.get("themes") or []) if t in valid]


def validate_item(data: dict):
    if data["kind"] not in KINDS:
        raise HTTPException(422, "Tipo non valido")
    for f in ("instagram", "info_link", "image_url"):
        data[f] = safe_url(data.get(f, ""))
    if data["kind"] in DATED:
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
        if it.kind in DATED:
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
    return [i for i in (Item.from_mongo(d) for d in docs) if not is_expired(i) and i.kind not in HIDDEN_CATS]


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
    featured = sorted([p for p in pres if p["featured"]], key=lambda p: (p["kind"] not in DATED, p.get("start_iso", "")))
    trending = [p for p in pres if (p["kind"] in DATED and p["_tonight"]) or (p["kind"] not in DATED and p["_score"] > 0)]
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
    tr = await get_settings()
    existing = await db.votes.find_one({"item_id": it.id, "voter": voter})
    if existing and existing["expires_at"] > now and existing["type"] == body.type:
        await db.votes.delete_one({"_id": existing["_id"]})
    else:
        if body.type == "here":
            exp = now + timedelta(hours=int(tr.get("here_hours", 4)))
        else:
            exp = now + timedelta(hours=int(tr.get("going_hours", 12)))
            if it.kind in DATED:
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


@api.post("/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(require_member)):
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


# ---------- dynamic structure & config ----------
async def refresh_kinds():
    KINDS.clear(); DATED.clear(); HIDDEN_CATS.clear()
    async for c in db.categories.find():
        KINDS.add(c["slug"])
        if c.get("dated"):
            DATED.add(c["slug"])
        if c.get("hidden"):
            HIDDEN_CATS.add(c["slug"])


def doc_out(d):
    o = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in d.items() if k != "_id"}
    o["id"] = str(d["_id"])
    return o


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "voce"


async def get_config():
    stored = await db.config.find_one({"_id": "app"}) or {}
    c = {**copy.deepcopy(DEFAULT_CONFIG), **stored}
    blocks = c["home"].get("blocks", [])
    ids = {b["id"] for b in blocks}
    for i, b in enumerate(DEFAULT_CONFIG["home"]["blocks"]):
        if b["id"] not in ids:
            blocks.insert(min(i, len(blocks)), dict(b))
    c["home"]["blocks"] = blocks
    return c


async def get_settings():
    return (await get_config())["trend"]


def today_rome():
    return datetime.now(ROME).date().isoformat()


def in_dates(d, today):
    return (not d.get("start") or d["start"] <= today) and (not d.get("end") or d["end"] >= today)


def resolve_home(home):
    today, wd = today_rome(), str(datetime.now(ROME).weekday())
    sch = home.get("schedules", [])
    m = next((s for s in sch if s.get("date") == today), None) or next((s for s in sch if not s.get("date") and str(s.get("day", "")) == wd), None)
    a = home.get("alert") or {}
    alert = a if a.get("active") and a.get("text") and in_dates(a, today) else None
    return {**home, "title": (m or {}).get("title") or home["title"], "subtitle": (m or {}).get("subtitle") or home["subtitle"], "alert": alert}


def public_post_q(slug=None):
    q = {"status": "approved", "completed": {"$ne": True}, "$or": [{"expires_at": None}, {"expires_at": {"$gt": now_utc()}}]}
    if slug:
        q["section"] = slug
    return q


@api.get("/config")
async def public_config():
    c = await get_config()
    cats = [doc_out(x) async for x in db.categories.find({"hidden": {"$ne": True}}).sort("order", 1)]
    secs = []
    async for s in db.sections.find({"hidden": {"$ne": True}}).sort("order", 1):
        o = doc_out(s)
        o["count"] = await db.posts.count_documents(public_post_q(s["slug"]))
        secs.append(o)
    return {"app_name": c["app_name"], "logo_url": c["logo_url"], "texts": c["texts"], "trend": c["trend"], "home": resolve_home(c["home"]),
            "zones": [z["name"] for z in c["zones"] if not z.get("hidden")], "towns": [t for t in c["towns"] if not t.get("hidden")],
            "categories": cats, "sections": secs, "themes": await themes_with_counts()}


def in_theme(t, it):
    return t["slug"] in (it.get("themes") or []) or it.get("category") in (t.get("subcategories") or [])


async def themes_with_counts(include_hidden=False):
    items = [i.model_dump() for i in await load_public_items()]
    q = {} if include_hidden else {"hidden": {"$ne": True}}
    out = []
    async for t in db.themes.find(q).sort("order", 1):
        o = doc_out(t)
        o["count"] = sum(1 for it in items if in_theme(t, it))
        o["upcoming"] = sum(1 for it in items if in_theme(t, it) and it["kind"] in DATED)
        out.append(o)
    return out


@api.get("/vivi/{slug}")
async def vivi_theme(slug: str, request: Request, when: str = "all", kind: str = "", town: str = "", sort: str = "smart"):
    t = await db.themes.find_one({"slug": slug, "hidden": {"$ne": True}})
    if not t:
        raise HTTPException(404, "Categoria non trovata")
    pres = [p for p in await present(await load_public_items(), await get_identity(request)) if in_theme(t, p)]
    facets = {"kinds": sorted({p["kind"] for p in pres}), "towns": sorted({p["town"] for p in pres if p.get("town")})}
    if kind:
        pres = [p for p in pres if p["kind"] == kind]
    if town:
        pres = [p for p in pres if p.get("town") == town]
    if when == "tonight":
        pres = [p for p in pres if p["kind"] in DATED and p["_tonight"]]
    elif when == "weekend":
        pres = [p for p in pres if p["kind"] in DATED and p["_weekend"]]
    elif when == "permanent":
        pres = [p for p in pres if p["kind"] not in DATED]
    keys = {"az": lambda p: p["title"].lower(), "trend": lambda p: (-p["_score"], p["title"].lower()),
            "smart": lambda p: (p["kind"] not in DATED, not p.get("live", False), p.get("start_iso") or "", -p["_score"])}
    pres.sort(key=keys.get(sort, keys["smart"]))
    return {"theme": doc_out(t), "facets": facets, "items": [clean(p) for p in pres]}


async def audit(a, action, target=""):
    await db.audit.insert_one({"user": a.get("username", "?"), "action": action, "target": str(target)[:160], "at": iso_now()})


async def require_super(request: Request):
    a = await require_admin(request)
    if a.get("role") != "superadmin":
        raise HTTPException(403, "Solo il Super Admin può farlo")
    return a


CONFIG_KEYS = {"app_name", "logo_url", "texts", "trend", "home", "zones", "towns"}


@api.get("/admin/config")
async def admin_get_config(a=Depends(require_super)):
    return {k: v for k, v in (await get_config()).items() if k != "_id"}


@api.put("/admin/config")
async def admin_put_config(body: dict, a=Depends(require_super)):
    upd = {k: v for k, v in body.items() if k in CONFIG_KEYS}
    if "trend" in upd:
        try:
            ok = 1 <= int(upd["trend"].get("threshold", 20)) <= 1000 and int(upd["trend"].get("going_hours", 12)) > 0 and int(upd["trend"].get("here_hours", 4)) > 0
        except (TypeError, ValueError):
            ok = False
        if not ok:
            raise HTTPException(422, "Soglia (1–1000) e durate devono essere numeri validi")
    await db.config.update_one({"_id": "app"}, {"$set": upd}, upsert=True)
    await audit(a, "config", ", ".join(upd))
    return await admin_get_config(a)


STRUCT = {"themes": ("items", "themes", {"name", "description", "icon", "color", "image_url", "subcategories", "hidden"}),
          "categories": ("items", "kind", {"name", "plural", "icon", "color", "subcategories", "dated", "hidden"}),
          "sections": ("posts", "section", {"name", "icon", "color", "description", "hidden", "fields", "tags", "reply_label", "requires_approval",
                                            "duration_days", "reactions", "partner_name", "partner_logo", "expiry_field"})}


def struct_meta(coll):
    if coll not in STRUCT:
        raise HTTPException(404, "Non trovato")
    return STRUCT[coll]


@api.get("/admin/struct/{coll}")
async def struct_list(coll: str, a=Depends(require_admin)):
    content, field, _ = struct_meta(coll)
    if coll == "themes":
        return await themes_with_counts(include_hidden=True)
    out = []
    async for d in db[coll].find().sort("order", 1):
        o = doc_out(d)
        o["count"] = await db[content].count_documents({field: d["slug"]})
        out.append(o)
    return out


@api.post("/admin/struct/{coll}")
async def struct_create(coll: str, body: dict, a=Depends(require_super)):
    _, _, keys = struct_meta(coll)
    data = {k: v for k, v in body.items() if k in keys}
    if not str(data.get("name", "")).strip():
        raise HTTPException(422, "Il nome è obbligatorio")
    base = slugify(data["name"]); slug = base; i = 2
    while await db[coll].find_one({"slug": slug}):
        slug = f"{base}-{i}"; i += 1
    defaults = {"icon": "Sparkles", "color": "#8B5CF6", "description": "", "image_url": "", "subcategories": [], "hidden": False} if coll == "themes" else ({"plural": data["name"], "icon": "Sparkles", "color": "#8B5CF6", "subcategories": [], "dated": False, "hidden": False}
                if coll == "categories" else
                {"icon": "Sparkles", "color": "#8B5CF6", "description": "", "hidden": False, "fields": [{"key": "title", "label": "Titolo", "type": "text", "required": True, "options": []},
                 {"key": "description", "label": "Descrizione", "type": "textarea", "required": False, "options": []}], "tags": [], "reply_label": "Rispondi",
                 "requires_approval": True, "duration_days": 30, "reactions": True, "partner_name": "", "partner_logo": "", "expiry_field": ""})
    doc = {**defaults, **data, "slug": slug, "order": await db[coll].count_documents({})}
    for f in doc.get("fields", []) if coll == "sections" else []:
        f["key"] = f.get("key") or slugify(f.get("label", "campo")).replace("-", "_")
    res = await db[coll].insert_one(doc)
    await refresh_kinds()
    await audit(a, f"crea {coll}", data["name"])
    return doc_out({**doc, "_id": res.inserted_id})


@api.put("/admin/struct/{coll}/{sid}")
async def struct_update(coll: str, sid: str, body: dict, a=Depends(require_super)):
    _, _, keys = struct_meta(coll)
    data = {k: v for k, v in body.items() if k in keys}
    if coll == "sections" and "fields" in data:
        for f in data["fields"]:
            f["key"] = f.get("key") or slugify(f.get("label", "campo")).replace("-", "_")
    res = await db[coll].update_one({"_id": oid(sid)}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(404, "Non trovato")
    await refresh_kinds()
    await audit(a, f"modifica {coll}", data.get("name", sid))
    return doc_out(await db[coll].find_one({"_id": oid(sid)}))


@api.delete("/admin/struct/{coll}/{sid}")
async def struct_delete(coll: str, sid: str, move_to: str = "", a=Depends(require_super)):
    content, field, _ = struct_meta(coll)
    d = await db[coll].find_one({"_id": oid(sid)})
    if not d:
        raise HTTPException(404, "Non trovato")
    if coll == "themes":
        await db.items.update_many({}, {"$pull": {"themes": d["slug"]}})
        n = 0
    else:
        n = await db[content].count_documents({field: d["slug"]})
    if n and not move_to:
        raise HTTPException(409, f"Contiene {n} contenuti: spostali prima in un'altra voce")
    if n:
        if move_to == d["slug"] or not await db[coll].find_one({"slug": move_to}):
            raise HTTPException(422, "Destinazione non valida")
        await db[content].update_many({field: d["slug"]}, {"$set": {field: move_to}})
    await db[coll].delete_one({"_id": d["_id"]})
    await refresh_kinds()
    await audit(a, f"elimina {coll}", d["name"])
    return {"ok": True}


class IdsIn(BaseModel):
    ids: list


@api.post("/admin/struct/{coll}/reorder")
async def struct_reorder(coll: str, body: IdsIn, a=Depends(require_super)):
    struct_meta(coll)
    for i, sid in enumerate(body.ids):
        await db[coll].update_one({"_id": oid(sid)}, {"$set": {"order": i}})
    return {"ok": True}


# ---------- bacheca (posts) ----------
class PostIn(BaseModel):
    data: dict
    tag: str = ""


async def get_section(slug, public=True):
    s = await db.sections.find_one({"slug": slug})
    if not s or (public and s.get("hidden")):
        raise HTTPException(404, "Sezione non trovata")
    return s


def title_of(sec, data):
    if data.get("from") and data.get("to"):
        return f"{data['from']} → {data['to']}"
    for f in sec.get("fields", []):
        if f.get("type") in ("text", "place", "select") and str(data.get(f["key"], "")).strip():
            return str(data[f["key"]])[:140]
    return sec["name"]


def clean_post(sec, data, tag, old=None):
    out = dict(old or {})
    for f in sec.get("fields", []):
        if not f.get("key"):
            continue
        v = data.get(f["key"], "")
        v = "" if v is None else str(v).strip()[:2000]
        if f.get("required") and not v:
            raise HTTPException(422, f"Compila il campo: {f['label']}")
        out[f["key"]] = safe_url(v) if f.get("type") in ("link", "photo") else v
    return out, (tag if tag in sec.get("tags", []) else "")


def post_expiry(sec, data):
    ef = sec.get("expiry_field")
    if ef and data.get(ef):
        try:
            return datetime.combine(date.fromisoformat(data[ef]), time(23, 59), tzinfo=ROME).astimezone(timezone.utc)
        except ValueError:
            pass
    days = int(sec.get("duration_days") or 0)
    return now_utc() + timedelta(days=days) if days > 0 else None


def post_out(d, mine=None, admin=False):
    o = doc_out(d)
    if not admin:
        o.pop("owner_user", None); o.pop("owner_name", None)
    o["my_reactions"] = mine or []
    return o


async def post_reacts(voter, ids):
    out = {}
    if voter:
        async for r in db.post_reactions.find({"voter": voter, "post_id": {"$in": ids}}):
            out.setdefault(r["post_id"], []).append(r["type"])
    return out


@api.get("/board/{slug}")
async def board_section(slug: str, request: Request, tag: str = "", q: str = ""):
    sec = await get_section(slug)
    ident = await get_identity(request)
    query = public_post_q(slug)
    if tag:
        query["tag"] = tag
    docs = await db.posts.find(query).sort("created_at", -1).to_list(1000)
    q = q.strip().lower()
    if q:
        docs = [d for d in docs if q in d.get("title", "").lower() or any(q in str(v).lower() for v in d.get("data", {}).values())]
    mine = await post_reacts(ident["voter"], [str(d["_id"]) for d in docs])
    return {"section": doc_out(sec), "posts": [post_out(d, mine.get(str(d["_id"]))) for d in docs]}


async def public_post(pid):
    d = await db.posts.find_one({**public_post_q(), "_id": oid(pid)})
    if not d:
        raise HTTPException(404, "Annuncio non trovato")
    return d


@api.post("/board/{slug}/posts")
async def create_post(slug: str, body: PostIn, user: User = Depends(require_member)):
    sec = await get_section(slug)
    data, tag = clean_post(sec, body.data, body.tag)
    status = "pending" if sec.get("requires_approval") else "approved"
    res = await db.posts.insert_one({"section": slug, "data": data, "tag": tag, "title": title_of(sec, data), "status": status, "reject_reason": "",
                               "completed": False, "reactions": {"heart": 0, "eyes": 0, "fire": 0}, "owner_user": user.id,
                               "owner_name": user.username, "created_at": iso_now(), "expires_at": post_expiry(sec, data)})
    schedule_moderation("posts", res.inserted_id)
    return {"ok": True, "status": status}


@api.post("/posts/{pid}/react")
async def post_react(pid: str, body: ReactIn, request: Request):
    if body.type not in REACTIONS:
        raise HTTPException(422, "Reazione non valida")
    ident = await get_identity(request)
    voter = need_voter(ident)
    d = await public_post(pid)
    sec = await get_section(d["section"])
    if not sec.get("reactions", True):
        raise HTTPException(403, "Reazioni disattivate")
    res = await db.post_reactions.delete_one({"post_id": pid, "voter": voter, "type": body.type})
    inc = -1 if res.deleted_count else 1
    if inc == 1:
        try:
            await db.post_reactions.insert_one({"post_id": pid, "voter": voter, "type": body.type})
        except DuplicateKeyError:
            inc = 0
    if inc:
        await db.posts.update_one({"_id": d["_id"]}, {"$inc": {f"reactions.{body.type}": inc}})
    d = await db.posts.find_one({"_id": d["_id"]})
    return post_out(d, (await post_reacts(voter, [pid])).get(pid))


@api.post("/posts/{pid}/reply")
async def post_reply(pid: str, body: ReplyIn, user: User = Depends(require_member)):
    d = await public_post(pid)
    if d.get("owner_user") == user.id:
        raise HTTPException(400, "Non puoi rispondere al tuo annuncio")
    await db.post_replies.insert_one({"post_id": pid, "post_title": d["title"], "section": d["section"], "owner_user": d.get("owner_user"),
                                      "from_user": user.id, "from_name": user.username, "message": body.message.strip(),
                                      "contact": body.contact.strip(), "read": False, "created_at": iso_now()})
    return {"ok": True}


class ReportIn(BaseModel):
    target_type: str
    target_id: str
    reason: str = Field(default="", max_length=500)


@api.post("/reports")
async def report(body: ReportIn, user: User = Depends(require_member)):
    if body.target_type not in ("item", "post"):
        raise HTTPException(422, "Tipo non valido")
    coll = db.items if body.target_type == "item" else db.posts
    t = await coll.find_one({"_id": oid(body.target_id)})
    if not t:
        raise HTTPException(404, "Contenuto non trovato")
    if await db.reports.find_one({"target_id": body.target_id, "by_user": user.username, "status": "open"}):
        return {"ok": True}
    await db.reports.insert_one({"target_type": body.target_type, "target_id": body.target_id, "title": t.get("title", ""), "reason": body.reason,
                                 "by_user": user.username, "status": "open", "created_at": iso_now()})
    return {"ok": True}


# ---------- polls ----------
class PollVoteIn(BaseModel):
    option: int


class PollIn(BaseModel):
    question: str = Field(min_length=3, max_length=200)
    options: list
    image_url: str = ""
    comment: str = ""
    start_date: str = ""


def poll_out(p, my=None, show=True):
    o = doc_out(p)
    total = sum(x["votes"] for x in p["options"])
    o.update(total=total, my_vote=my)
    o["options"] = [{"text": x["text"], **({"votes": x["votes"], "pct": round(100 * x["votes"] / total) if total else 0} if show else {})} for x in p["options"]]
    if not show:
        o.pop("comment", None); o["total"] = None
    return o


@api.get("/poll")
async def get_poll(request: Request):
    p = await db.polls.find_one({"status": "open", "start_date": {"$lte": today_rome()}}, sort=[("start_date", -1), ("created_at", -1)])
    if not p:
        return None
    keys = await poll_keys(request)
    v = await db.poll_votes.find_one({"poll_id": str(p["_id"]), "voter": {"$in": keys}}) if keys else None
    return poll_out(p, v["option"] if v else None, show=bool(v))


async def poll_keys(request: Request):
    ident = await get_identity(request)
    dev = re.sub(r"[^a-zA-Z0-9\-]", "", request.headers.get("X-Device-Id", ""))[:64]
    return [k for k in {ident["voter"], f"d:{dev}" if dev else None} if k]


@api.post("/poll/{pid}/vote")
async def vote_poll(pid: str, body: PollVoteIn, request: Request):
    keys = await poll_keys(request)
    if not keys:
        raise HTTPException(400, "Dispositivo non riconosciuto")
    p = await db.polls.find_one({"_id": oid(pid), "status": "open"})
    if not p or not 0 <= body.option < len(p["options"]):
        raise HTTPException(404, "Sondaggio non disponibile")
    if await db.poll_votes.find_one({"poll_id": pid, "voter": {"$in": keys}}):
        raise HTTPException(409, "Hai già votato")
    try:
        await db.poll_votes.insert_many([{"poll_id": pid, "voter": k, "option": body.option} for k in keys], ordered=False)
    except Exception:
        raise HTTPException(409, "Hai già votato")
    await db.polls.update_one({"_id": p["_id"]}, {"$inc": {f"options.{body.option}.votes": 1}})
    return poll_out(await db.polls.find_one({"_id": p["_id"]}), body.option)


def poll_doc(body: PollIn):
    opts = [str(o).strip()[:80] for o in body.options if str(o).strip()]
    if not 2 <= len(opts) <= 4:
        raise HTTPException(422, "Servono da 2 a 4 opzioni")
    return {"question": body.question, "image_url": safe_url(body.image_url), "comment": body.comment[:300],
            "start_date": body.start_date or today_rome()}, opts


@api.get("/admin/polls")
async def admin_polls(a=Depends(require_admin)):
    return [poll_out(p) for p in await db.polls.find().sort([("start_date", -1), ("created_at", -1)]).to_list(300)]


@api.post("/admin/polls")
async def admin_create_poll(body: PollIn, a=Depends(require_admin)):
    d, opts = poll_doc(body)
    await db.polls.insert_one({**d, "options": [{"text": o, "votes": 0} for o in opts], "status": "open", "created_at": iso_now()})
    await audit(a, "crea sondaggio", d["question"])
    return {"ok": True}


@api.put("/admin/polls/{pid}")
async def admin_update_poll(pid: str, body: PollIn, a=Depends(require_admin)):
    p = await db.polls.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(404, "Sondaggio non trovato")
    d, opts = poll_doc(body)
    old = p["options"]
    d["options"] = [{"text": t, "votes": old[i]["votes"] if i < len(old) else 0} for i, t in enumerate(opts)]
    await db.polls.update_one({"_id": p["_id"]}, {"$set": d})
    await audit(a, "modifica sondaggio", d["question"])
    return {"ok": True}


@api.post("/admin/polls/{pid}/close")
async def admin_close_poll(pid: str, a=Depends(require_admin)):
    await db.polls.update_one({"_id": oid(pid)}, {"$set": {"status": "closed"}})
    await audit(a, "chiude sondaggio", pid)
    return {"ok": True}


@api.delete("/admin/polls/{pid}")
async def admin_delete_poll(pid: str, a=Depends(require_admin)):
    await db.polls.delete_one({"_id": oid(pid)})
    await db.poll_votes.delete_many({"poll_id": pid})
    await audit(a, "elimina sondaggio", pid)
    return {"ok": True}


# ---------- banners ----------
BANNER_KEYS = {"image_url", "title", "text", "cta", "link", "position", "every_n", "start", "end", "active", "priority"}


@api.get("/banners")
async def get_banners(position: str):
    today = today_rome()
    docs = await db.banners.find({"active": True, "position": position}).sort("priority", -1).to_list(50)
    docs = [d for d in docs if in_dates(d, today)]
    if docs:
        await db.banners.update_many({"_id": {"$in": [d["_id"] for d in docs]}}, {"$inc": {"views": 1}})
    return [{k: v for k, v in doc_out(d).items() if k not in ("views", "clicks")} for d in docs]


@api.post("/banners/{bid}/click")
async def click_banner(bid: str):
    await db.banners.update_one({"_id": oid(bid)}, {"$inc": {"clicks": 1}})
    return {"ok": True}


@api.get("/admin/banners")
async def admin_banners(a=Depends(require_super)):
    return [doc_out(d) for d in await db.banners.find().sort("priority", -1).to_list(300)]


@api.post("/admin/banners")
async def admin_create_banner(body: dict, a=Depends(require_super)):
    d = {k: v for k, v in body.items() if k in BANNER_KEYS}
    d = {"image_url": "", "title": "", "text": "", "cta": "Scopri", "link": "", "position": "home_top", "every_n": 5, "start": "", "end": "",
         "active": True, "priority": 0, **d, "views": 0, "clicks": 0, "created_at": iso_now()}
    await db.banners.insert_one(d)
    await audit(a, "crea banner", d.get("title"))
    return {"ok": True}


@api.put("/admin/banners/{bid}")
async def admin_update_banner(bid: str, body: dict, a=Depends(require_super)):
    await db.banners.update_one({"_id": oid(bid)}, {"$set": {k: v for k, v in body.items() if k in BANNER_KEYS}})
    await audit(a, "modifica banner", body.get("title", bid))
    return {"ok": True}


@api.delete("/admin/banners/{bid}")
async def admin_delete_banner(bid: str, a=Depends(require_super)):
    await db.banners.delete_one({"_id": oid(bid)})
    await audit(a, "elimina banner", bid)
    return {"ok": True}


# ---------- auth & account ----------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]{3,30}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@api.post("/auth/register")
async def register(body: RegisterIn):
    username, email = body.username.strip(), body.email.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(422, "Username: 3–30 caratteri tra lettere, numeri, _ e .")
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Email non valida")
    if len(body.password) < 6:
        raise HTTPException(422, "La password deve avere almeno 6 caratteri")
    if await db.users.find_one({"$or": [{"email": email}, {"username_lower": username.lower()}]}):
        raise HTTPException(409, "Username o email già registrati")
    u = User(username=username, email=email, password_hash=hash_pw(body.password))
    res = await db.users.insert_one({**u.to_mongo(), "username_lower": username.lower()})
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


class PasswordIn(BaseModel):
    old_password: str
    new_password: str


class EmailIn(BaseModel):
    email: str
    password: str


class ConfirmIn(BaseModel):
    password: str


@api.put("/me/password")
async def change_password(body: PasswordIn, user: User = Depends(require_user)):
    if not check_pw(body.old_password, user.password_hash):
        raise HTTPException(401, "Password attuale non corretta")
    if len(body.new_password) < 6:
        raise HTTPException(422, "La nuova password deve avere almeno 6 caratteri")
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"password_hash": hash_pw(body.new_password)}})
    return {"ok": True}


@api.put("/me/email")
async def change_email(body: EmailIn, user: User = Depends(require_user)):
    email = body.email.strip().lower()
    if not check_pw(body.password, user.password_hash):
        raise HTTPException(401, "Password non corretta")
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Email non valida")
    if await db.users.find_one({"email": email, "_id": {"$ne": ObjectId(user.id)}}):
        raise HTTPException(409, "Email già in uso")
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"email": email}})
    return {**user_out(user), "email": email}


@api.post("/me/delete")
async def delete_account(body: ConfirmIn, user: User = Depends(require_user)):
    if not check_pw(body.password, user.password_hash):
        raise HTTPException(401, "Password non corretta")
    if user.role == "superadmin":
        raise HTTPException(403, "Il Super Admin non può eliminarsi")
    await db.users.delete_one({"_id": ObjectId(user.id)})
    await db.posts.delete_many({"owner_user": user.id})
    await db.post_replies.delete_many({"from_user": user.id})
    return {"ok": True}


@api.get("/me/saved")
async def my_saved(request: Request):
    ident = await get_identity(request)
    voter = need_voter(ident)
    ids = [s["item_id"] async for s in db.saves.find({"voter": voter}).sort("created_at", -1)]
    docs = await db.items.find({"_id": {"$in": [ObjectId(i) for i in ids]}, "status": "approved"}).to_list(500)
    items = [i for i in (Item.from_mongo(d) for d in docs) if not is_expired(i)]
    return [clean(p) for p in await present(items, ident)]


@api.get("/me/inbox")
async def my_inbox(user: User = Depends(require_user)):
    return [doc_out(d) for d in await db.post_replies.find({"owner_user": user.id}).sort("created_at", -1).to_list(500)]


@api.get("/me/unread")
async def my_unread(user: User = Depends(require_user)):
    return {"count": await db.post_replies.count_documents({"owner_user": user.id, "read": False})}


@api.post("/me/inbox/read")
async def mark_read(user: User = Depends(require_user)):
    await db.post_replies.update_many({"owner_user": user.id}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/me/listings")
async def my_listings(user: User = Depends(require_user)):
    out = []
    async for d in db.items.find({"created_by": f"u:{user.id}"}):
        it = Item.from_mongo(d)
        out.append({"id": it.id, "type": "item", "kind": it.kind, "title": it.title, "status": it.status, "reject_reason": it.reject_reason,
                    "expired": is_expired(it), "completed": False, "created_at": it.created_at, "item": it.model_dump()})
    now = now_utc()
    async for d in db.posts.find({"owner_user": user.id}):
        o = post_out(d, admin=True)
        out.append({"id": o["id"], "type": "post", "kind": d["section"], "title": d["title"], "status": d["status"],
                    "reject_reason": d.get("reject_reason", ""), "completed": d.get("completed", False),
                    "expired": bool(d.get("expires_at") and d["expires_at"] < now), "created_at": d["created_at"], "post": o})
    out.sort(key=lambda x: x["created_at"], reverse=True)
    return out


async def own_post(pid, user):
    d = await db.posts.find_one({"_id": oid(pid), "owner_user": user.id})
    if not d:
        raise HTTPException(404, "Annuncio non trovato")
    return d


@api.put("/me/posts/{pid}")
async def edit_my_post(pid: str, body: PostIn, user: User = Depends(require_member)):
    d = await own_post(pid, user)
    sec = await get_section(d["section"], public=False)
    data, tag = clean_post(sec, body.data, body.tag, d.get("data"))
    upd = {"data": data, "tag": tag, "title": title_of(sec, data), "expires_at": post_expiry(sec, data), "reject_reason": ""}
    if sec.get("requires_approval"):
        upd["status"] = "pending"
    await db.posts.update_one({"_id": d["_id"]}, {"$set": upd})
    schedule_moderation("posts", d["_id"])
    return {"ok": True, "status": upd.get("status", d["status"])}


@api.post("/me/posts/{pid}/complete")
async def complete_my_post(pid: str, user: User = Depends(require_user)):
    d = await own_post(pid, user)
    await db.posts.update_one({"_id": d["_id"]}, {"$set": {"completed": not d.get("completed", False)}})
    return {"ok": True}


@api.delete("/me/posts/{pid}")
async def delete_my_post(pid: str, user: User = Depends(require_user)):
    d = await own_post(pid, user)
    await db.posts.delete_one({"_id": d["_id"]})
    return {"ok": True}


@api.put("/me/items/{item_id}")
async def edit_my_item(item_id: str, body: ItemIn, user: User = Depends(require_member)):
    data = body.model_dump()
    validate_item(data)
    await clean_themes(data)
    res = await db.items.update_one({"_id": oid(item_id), "created_by": f"u:{user.id}"}, {"$set": {**data, "status": "pending", "reject_reason": ""}})
    if not res.matched_count:
        raise HTTPException(404, "Elemento non trovato")
    schedule_moderation("items", oid(item_id))
    return {"ok": True}


@api.delete("/me/items/{item_id}")
async def delete_my_item(item_id: str, user: User = Depends(require_user)):
    await db.items.delete_one({"_id": oid(item_id), "created_by": f"u:{user.id}"})
    return {"ok": True}


@api.post("/submissions/item")
async def submit_item(body: ItemIn, user: User = Depends(require_member)):
    data = body.model_dump()
    validate_item(data)
    await clean_themes(data)
    res = await db.items.insert_one(Item(**data, status="pending", created_by=f"u:{user.id}").to_mongo())
    schedule_moderation("items", res.inserted_id)
    return {"ok": True}


# ---------- admin: moderation & content ----------
@api.get("/admin/check")
async def admin_check(a=Depends(require_admin)):
    return {"ok": True, "role": a["role"]}


@api.get("/admin/pending")
async def admin_pending(a=Depends(require_admin)):
    items = [Item.from_mongo(d) for d in await db.items.find({"status": "pending"}).sort("created_at", -1).to_list(500)]
    posts = await db.posts.find({"status": "pending"}).sort("created_at", -1).to_list(500)
    return {"items": [clean(p) for p in await present(items, admin=True)], "posts": [post_out(d, admin=True) for d in posts]}


@api.get("/admin/items")
async def admin_items(kind: str = "", status: str = "approved", a=Depends(require_admin)):
    query = {}
    if kind:
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
async def admin_create_item(body: ItemIn, a=Depends(require_admin)):
    data = body.model_dump()
    validate_item(data)
    await clean_themes(data)
    res = await db.items.insert_one(Item(**data, status="approved", created_by="admin").to_mongo())
    await audit(a, "crea elemento", data["title"])
    return await admin_item_out(str(res.inserted_id))


@api.put("/admin/items/{item_id}")
async def admin_update_item(item_id: str, body: ItemIn, a=Depends(require_admin)):
    data = body.model_dump()
    validate_item(data)
    await clean_themes(data)
    res = await db.items.update_one({"_id": oid(item_id)}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(404, "Elemento non trovato")
    await audit(a, "modifica elemento", data["title"])
    return await admin_item_out(item_id)


@api.post("/admin/items/{item_id}/status")
async def admin_item_status(item_id: str, body: StatusIn, a=Depends(require_admin)):
    if body.status not in ("approved", "pending", "rejected"):
        raise HTTPException(422, "Stato non valido")
    await db.items.update_one({"_id": oid(item_id)}, {"$set": {"status": body.status, "reject_reason": body.reason if body.status == "rejected" else ""}})
    out = await admin_item_out(item_id)
    await audit(a, f"stato {body.status}", out["title"])
    return out


@api.post("/admin/items/{item_id}/feature")
async def admin_item_feature(item_id: str, a=Depends(require_admin)):
    it = await db.items.find_one({"_id": oid(item_id)})
    if not it:
        raise HTTPException(404, "Elemento non trovato")
    await db.items.update_one({"_id": it["_id"]}, {"$set": {"featured": not it.get("featured", False)}})
    await audit(a, "evidenza", it["title"])
    return await admin_item_out(item_id)


@api.post("/admin/items/{item_id}/boost")
async def admin_item_boost(item_id: str, body: BoostIn, a=Depends(require_admin)):
    update = {"$set": {"boost": 0}} if body.amount == 0 else {"$inc": {"boost": max(-100, min(body.amount, 500))}}
    res = await db.items.update_one({"_id": oid(item_id)}, update)
    if not res.matched_count:
        raise HTTPException(404, "Elemento non trovato")
    await db.items.update_one({"_id": oid(item_id), "boost": {"$lt": 0}}, {"$set": {"boost": 0}})
    out = await admin_item_out(item_id)
    await audit(a, f"boost {body.amount}", out["title"])
    return out


@api.delete("/admin/items/{item_id}")
async def admin_delete_item(item_id: str, a=Depends(require_admin)):
    it = await db.items.find_one({"_id": oid(item_id)})
    await db.items.delete_one({"_id": oid(item_id)})
    await db.votes.delete_many({"item_id": item_id})
    await db.saves.delete_many({"item_id": item_id})
    await audit(a, "elimina elemento", (it or {}).get("title", item_id))
    return {"ok": True}


class AdminPostIn(PostIn):
    section: str


@api.get("/admin/posts")
async def admin_posts(section: str = "", status: str = "approved", a=Depends(require_admin)):
    q = {}
    if section:
        q["section"] = section
    if status:
        q["status"] = status
    docs = await db.posts.find(q).sort("created_at", -1).to_list(2000)
    out = []
    for d in docs:
        o = post_out(d, admin=True)
        o["reply_count"] = await db.post_replies.count_documents({"post_id": o["id"]})
        out.append(o)
    return out


@api.post("/admin/posts")
async def admin_create_post(body: AdminPostIn, a=Depends(require_admin)):
    sec = await get_section(body.section, public=False)
    data, tag = clean_post(sec, body.data, body.tag)
    await db.posts.insert_one({"section": sec["slug"], "data": data, "tag": tag, "title": title_of(sec, data), "status": "approved", "reject_reason": "",
                               "completed": False, "reactions": {"heart": 0, "eyes": 0, "fire": 0}, "owner_user": None,
                               "owner_name": a["username"], "created_at": iso_now(), "expires_at": post_expiry(sec, data)})
    await audit(a, "crea annuncio", title_of(sec, data))
    return {"ok": True}


@api.put("/admin/posts/{pid}")
async def admin_update_post(pid: str, body: PostIn, a=Depends(require_admin)):
    d = await db.posts.find_one({"_id": oid(pid)})
    if not d:
        raise HTTPException(404, "Annuncio non trovato")
    sec = await get_section(d["section"], public=False)
    data, tag = clean_post(sec, body.data, body.tag, d.get("data"))
    await db.posts.update_one({"_id": d["_id"]}, {"$set": {"data": data, "tag": tag, "title": title_of(sec, data), "expires_at": post_expiry(sec, data)}})
    await audit(a, "modifica annuncio", title_of(sec, data))
    return {"ok": True}


@api.post("/admin/posts/{pid}/status")
async def admin_post_status(pid: str, body: StatusIn, a=Depends(require_admin)):
    if body.status not in ("approved", "pending", "rejected"):
        raise HTTPException(422, "Stato non valido")
    d = await db.posts.find_one_and_update({"_id": oid(pid)}, {"$set": {"status": body.status, "reject_reason": body.reason if body.status == "rejected" else ""}})
    if not d:
        raise HTTPException(404, "Annuncio non trovato")
    await audit(a, f"stato {body.status}", d["title"])
    return {"ok": True}


@api.delete("/admin/posts/{pid}")
async def admin_delete_post(pid: str, a=Depends(require_admin)):
    d = await db.posts.find_one_and_delete({"_id": oid(pid)})
    await db.post_replies.delete_many({"post_id": pid})
    await db.post_reactions.delete_many({"post_id": pid})
    await audit(a, "elimina annuncio", (d or {}).get("title", pid))
    return {"ok": True}


@api.get("/admin/replies")
async def admin_replies(a=Depends(require_admin)):
    return [doc_out(d) for d in await db.post_replies.find().sort("created_at", -1).to_list(1000)]


@api.get("/admin/reports")
async def admin_reports(status: str = "open", a=Depends(require_admin)):
    return [doc_out(d) for d in await db.reports.find({"status": status}).sort("created_at", -1).to_list(500)]


class ReportActionIn(BaseModel):
    action: str


@api.post("/admin/reports/{rid}/action")
async def admin_report_action(rid: str, body: ReportActionIn, a=Depends(require_admin)):
    r = await db.reports.find_one({"_id": oid(rid)})
    if not r or body.action not in ("hide", "ignore", "block"):
        raise HTTPException(404, "Segnalazione non trovata")
    coll = db.items if r["target_type"] == "item" else db.posts
    if body.action in ("hide", "block"):
        t = await coll.find_one_and_update({"_id": oid(r["target_id"])}, {"$set": {"status": "rejected", "reject_reason": "Rimosso dopo una segnalazione"}})
        owner = None
        if t:
            cb = str(t.get("created_by") or "")
            owner = t.get("owner_user") or (cb[2:] if cb.startswith("u:") else None)
        if body.action == "block" and owner:
            await db.users.update_one({"_id": oid(owner), "role": {"$ne": "superadmin"}}, {"$set": {"blocked": True}})
    await db.reports.update_many({"target_id": r["target_id"], "status": "open"}, {"$set": {"status": "ignored" if body.action == "ignore" else "resolved"}})
    await audit(a, f"segnalazione {body.action}", r.get("title"))
    return {"ok": True}


# ---------- super admin: users, audit, backup, stats ----------
@api.get("/admin/users")
async def admin_users(q: str = "", a=Depends(require_super)):
    query = {"$or": [{"username_lower": {"$regex": re.escape(q.lower())}}, {"email": {"$regex": re.escape(q.lower())}}]} if q else {}
    out = []
    for d in await db.users.find(query).sort("created_at", -1).to_list(500):
        uid = str(d["_id"])
        out.append({"id": uid, "username": d["username"], "email": d["email"], "role": d.get("role", "user"), "blocked": d.get("blocked", False),
                    "created_at": d.get("created_at"), "content_count": await db.posts.count_documents({"owner_user": uid}) +
                    await db.items.count_documents({"created_by": f"u:{uid}"})})
    return out


class UserActionIn(BaseModel):
    role: Optional[str] = None
    blocked: Optional[bool] = None
    password: Optional[str] = None


@api.post("/admin/users/{uid}")
async def admin_user_action(uid: str, body: UserActionIn, a=Depends(require_super)):
    u = await db.users.find_one({"_id": oid(uid)})
    if not u or u.get("role") == "superadmin":
        raise HTTPException(403, "Utente non modificabile")
    upd = {}
    if body.role in ("user", "admin"):
        upd["role"] = body.role
    if body.blocked is not None:
        upd["blocked"] = body.blocked
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(422, "Password di almeno 6 caratteri")
        upd["password_hash"] = hash_pw(body.password)
    await db.users.update_one({"_id": u["_id"]}, {"$set": upd})
    await audit(a, "utente " + ", ".join(k for k in upd if k != "password_hash") + (" password" if body.password else ""), u["username"])
    return {"ok": True}


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, a=Depends(require_super)):
    u = await db.users.find_one({"_id": oid(uid)})
    if not u or u.get("role") == "superadmin":
        raise HTTPException(403, "Utente non eliminabile")
    await db.users.delete_one({"_id": u["_id"]})
    await db.posts.delete_many({"owner_user": uid})
    await db.post_replies.delete_many({"from_user": uid})
    await db.items.update_many({"created_by": f"u:{uid}"}, {"$set": {"created_by": "deleted"}})
    await audit(a, "elimina utente", u["username"])
    return {"ok": True}


@api.get("/admin/audit")
async def admin_audit(a=Depends(require_super)):
    return [doc_out(d) for d in await db.audit.find().sort("at", -1).to_list(300)]


BACKUP_COLLS = ["themes", "items", "posts", "categories", "sections", "polls", "banners", "config", "users", "post_replies", "reports"]


@api.get("/admin/backup")
async def admin_backup(a=Depends(require_super)):
    data = {}
    for c in BACKUP_COLLS:
        docs = await db[c].find().to_list(100000)
        if c == "users":
            for d in docs:
                d.pop("password_hash", None)
        data[c] = docs
    await audit(a, "esporta backup")
    return Response(content=json_util.dumps({"version": 2, "exported_at": iso_now(), "data": data}), media_type="application/json",
                    headers={"Content-Disposition": f"attachment; filename=backup-cosafare-{today_rome()}.json"})


@api.post("/admin/restore")
async def admin_restore(file: UploadFile = File(...), a=Depends(require_super)):
    try:
        payload = json_util.loads(await file.read())["data"]
    except Exception:
        raise HTTPException(422, "File di backup non valido")
    for c in BACKUP_COLLS:
        if c not in payload:
            continue
        docs = payload[c]
        if c == "users":
            existing = {d["_id"]: d.get("password_hash") async for d in db.users.find()}
            for d in docs:
                d["password_hash"] = existing.get(d["_id"]) or hash_pw(secrets.token_urlsafe(12))
        await db[c].delete_many({})
        if docs:
            await db[c].insert_many(docs)
    await seed_admin()
    await refresh_kinds()
    await audit(a, "ripristina backup")
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(a=Depends(require_admin)):
    week = (now_utc() - timedelta(days=7)).isoformat()
    per_section = {}
    async for s in db.sections.find().sort("order", 1):
        per_section[s["name"]] = await db.posts.count_documents(public_post_q(s["slug"]))
    return {"items_active": len(await load_public_items()), "posts_active": sum(per_section.values()), "per_section": per_section,
            "new_users_7d": await db.users.count_documents({"created_at": {"$gte": week}}),
            "votes_active": await db.votes.count_documents({"expires_at": {"$gt": now_utc()}}),
            "pending": await db.items.count_documents({"status": "pending"}) + await db.posts.count_documents({"status": "pending"}),
            "reports_open": await db.reports.count_documents({"status": "open"})}


# ---------- AI (Gemini) ----------
GEMINI_MODEL = ("gemini", "gemini-3-flash-preview")
DRAFT_SEP = "<<<BOZZA>>>"
AI_TASKS = set()
URL_RE = re.compile(r"https?://[^\s<>\"']+")


def new_chat(session: str, system: str):
    return LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session, system_message=system).with_model(*GEMINI_MODEL)


def user_msg(text, images=None):
    return UserMessage(text=text, file_contents=[ImageContent(image_base64=b) for b in images]) if images else UserMessage(text=text)


async def llm_collect(session, system, text, images=None):
    out = []
    async for ev in new_chat(session, system).stream_message(user_msg(text, images)):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(out)


def parse_json(raw: str):
    m = re.search(r"\{.*\}", raw or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except ValueError:
        return None


MOD_SYSTEM = (
    "Sei il moderatore di 'Cosa Fare a Potenza', app per giovani e studenti di Potenza. Valuta il contenuto inviato da un utente. "
    "Rischi da segnalare: dati personali di terzi (numeri di telefono, indirizzi privati, nome e cognome completi di persone descritte negli Spotted), "
    "insulti, molestie, body shaming, contenuti sessuali espliciti, riferimenti a minori in contesti inappropriati, discriminazione, droga, violenza, "
    "spam, truffe o annunci di lavoro/affitto sospetti. Un contenuto normale e innocuo è 'low'. "
    "Rispondi SOLO con JSON: {\"risk\": \"low|medium|high\", \"reasons\": [\"motivo breve in italiano\", ...], \"summary\": \"una frase\"}"
)


def content_text(coll, d):
    if coll == "posts":
        return f"Sezione: {d.get('section')}\nEtichetta: {d.get('tag')}\n" + "\n".join(f"{k}: {v}" for k, v in (d.get("data") or {}).items() if v)
    keys = ("kind", "title", "category", "town", "zone", "address", "description", "price", "instagram", "info_link")
    return "\n".join(f"{k}: {d.get(k)}" for k in keys if d.get(k))


async def ai_moderate(coll: str, _id):
    d = await db[coll].find_one({"_id": _id})
    if not d:
        return None
    try:
        j = parse_json(await llm_collect(f"mod-{_id}-{uuid.uuid4().hex[:6]}", MOD_SYSTEM, content_text(coll, d))) or {}
    except Exception as e:
        logger.warning(f"AI moderation failed: {e}")
        return None
    risk = j.get("risk") if j.get("risk") in ("low", "medium", "high") else "medium"
    review = {"risk": risk, "reasons": [str(r)[:160] for r in (j.get("reasons") or [])][:5], "summary": str(j.get("summary", ""))[:240], "at": iso_now()}
    upd = {"ai_review": review}
    if coll == "posts" and risk == "high" and d.get("status") == "approved" and d.get("owner_user"):
        upd.update(status="pending", ai_held=True)
    await db[coll].update_one({"_id": _id}, {"$set": upd})
    return review


def schedule_moderation(coll, _id):
    t = asyncio.create_task(ai_moderate(coll, _id))
    AI_TASKS.add(t)
    t.add_done_callback(AI_TASKS.discard)


@api.post("/admin/ai/moderate/{entity}/{eid}")
async def admin_ai_moderate(entity: str, eid: str, a=Depends(require_admin)):
    coll = {"item": "items", "post": "posts"}.get(entity)
    if not coll:
        raise HTTPException(404, "Non trovato")
    review = await ai_moderate(coll, oid(eid))
    if not review:
        raise HTTPException(502, "Analisi AI non disponibile, riprova")
    return review


def safe_host(url: str) -> bool:
    host = (re.match(r"https?://([^/:?#]+)", url) or [None, ""])[1].lower()
    return bool(host) and not re.match(r"^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)", host) and "." in host


async def fetch_link(url: str):
    if not safe_host(url):
        return None
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (compatible; CosaFarePotenzaBot/1.0)"}) as c:
            r = await c.get(url)
        html = r.text[:400_000]
    except Exception:
        return None
    meta = lambda p: (re.search(rf'<meta[^>]+(?:property|name)=["\']{p}["\'][^>]+content=["\']([^"\']*)', html, re.I) or [None, ""])[1]
    title = (re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S) or [None, ""])[1]
    body = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)))
    return {"url": url, "title": title.strip()[:200], "description": (meta("og:description") or meta("description"))[:1500],
            "image": meta("og:image"), "text": body.strip()[:3500]}


async def image_b64(url: str):
    try:
        if url.startswith("/api/files/"):
            data, _ = await run_in_threadpool(get_object, url[len("/api/files/"):])
        elif safe_host(url):
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
                r = await c.get(url)
            if not r.headers.get("content-type", "").startswith("image/"):
                return None
            data = r.content
        else:
            return None
        return base64.b64encode(data).decode() if len(data) < 6 * 1024 * 1024 else None
    except Exception as e:
        logger.warning(f"AI image fetch failed: {e}")
        return None


async def assistant_system():
    cats = [{"slug": c["slug"], "nome": c["name"], "con_data": c.get("dated", False), "sottocategorie": c.get("subcategories", [])}
            async for c in db.categories.find({"hidden": {"$ne": True}}).sort("order", 1)]
    secs = [{"slug": s["slug"], "nome": s["name"], "etichette": s.get("tags", []),
             "campi": [{"key": f["key"], "label": f["label"], "tipo": f["type"], "obbligatorio": f.get("required", False), "opzioni": f.get("options", [])} for f in s.get("fields", []) if f.get("key")]}
            async for s in db.sections.find({"hidden": {"$ne": True}}).sort("order", 1)]
    themes = [t["slug"] async for t in db.themes.find({"hidden": {"$ne": True}})]
    c = await get_config()
    now = datetime.now(ROME)
    return (
        "Sei 'Lucy', l'assistente simpatica e alla mano dell'app 'Cosa Fare a Potenza' (Potenza e provincia, Basilicata). Parli in italiano, tono amichevole, frasi brevi, qualche emoji. "
        "Aiuti l'utente a pubblicare un contenuto: lui ti incolla un testo, un link (es. post Instagram) o una foto di una locandina e tu riconosci tutto e prepari la bozza. "
        "Se mancano dati importanti (es. la data di un evento) chiedili gentilmente. Non inventare MAI dati non presenti: lascia vuoto. "
        f"Oggi è {now.strftime('%A %d/%m/%Y')} (ora italiana). Converti date relative in YYYY-MM-DD e orari in HH:MM.\n"
        f"CATEGORIE ESPLORA (target='item'): {json.dumps(cats, ensure_ascii=False)}\n"
        "Campi item: title, category (una delle sottocategorie), town, zone, address, description, start_date, start_time, end_time (solo categorie con_data), "
        f"opening_hours, price, instagram, info_link, image_url, themes (lista tra {themes}).\n"
        f"SEZIONI BACHECA (target='post', es. spotted, case, lavoro, passaggi): {json.dumps(secs, ensure_ascii=False)}\n"
        f"Comuni: {[t['name'] for t in c['towns']]}. Zone di Potenza: {[z['name'] for z in c['zones']]}.\n"
        "FORMATO RISPOSTA OBBLIGATORIO: prima il tuo messaggio per l'utente (max 4 frasi, riassumi cosa hai capito e cosa manca), poi su una riga a parte "
        f"esattamente {DRAFT_SEP} seguito da un JSON: "
        "{\"target\": \"item\"|\"post\"|null, \"kind\": \"slug ESATTO della categoria (es. event, venue) o null\", \"section\": \"slug sezione o null\", \"tag\": \"\", \"fields\": {...}, \"missing\": [\"campi obbligatori mancanti\"]}. "
        "Per i post usa come chiavi di 'fields' le key dei campi della sezione. Se non c'è ancora abbastanza per capire cosa pubblicare, target null."
    )


ITEM_KEYS = set(ItemIn.model_fields)


async def clean_draft(d):
    if not isinstance(d, dict) or d.get("target") not in ("item", "post"):
        return None
    f = d.get("fields") if isinstance(d.get("fields"), dict) else {}
    if d["target"] == "item":
        k = str(d.get("kind") or "").strip().lower()
        if k not in KINDS:
            sub = str(f.get("category") or k).lower()
            async for c in db.categories.find({"hidden": {"$ne": True}}):
                if k in (c["name"].lower(), c.get("plural", "").lower()) or sub in [x.lower() for x in c.get("subcategories", [])]:
                    k = c["slug"]
                    break
        if k not in KINDS or k in HIDDEN_CATS:
            return None
        d["kind"] = k
        fields = {k: (v if k == "themes" else str(v or "")) for k, v in f.items() if k in ITEM_KEYS and k != "kind"}
        if "themes" in fields:
            await clean_themes(fields)
        return {"target": "item", "kind": d["kind"], "fields": fields, "missing": d.get("missing") or []}
    sec = await db.sections.find_one({"slug": d.get("section"), "hidden": {"$ne": True}})
    if not sec:
        return None
    keys = {x["key"] for x in sec.get("fields", []) if x.get("key")}
    return {"target": "post", "section": sec["slug"], "tag": d.get("tag") if d.get("tag") in sec.get("tags", []) else "",
            "fields": {k: str(v or "") for k, v in f.items() if k in keys}, "missing": d.get("missing") or []}


class AssistantIn(BaseModel):
    session_id: str = Field(min_length=6, max_length=64)
    message: str = Field(default="", max_length=4000)
    image_url: str = ""


@api.post("/ai/assistant")
async def ai_assistant(body: AssistantIn, user: User = Depends(require_member)):
    if not body.message.strip() and not body.image_url:
        raise HTTPException(422, "Scrivi un messaggio, incolla un link o allega una locandina")
    conv = await db.ai_chats.find_one({"session_id": body.session_id, "user_id": user.id}) or {"messages": [], "draft": None}
    links = [x for x in [await fetch_link(u) for u in URL_RE.findall(body.message)[:2]] if x]
    images = [b for b in [await image_b64(body.image_url)] if b] if body.image_url else []
    if links and links[0].get("image") and not images:
        images = [b for b in [await image_b64(links[0]["image"])] if b]
    history = "\n".join(f"{'Utente' if m['role'] == 'user' else 'Lucy'}: {m['text']}" for m in conv["messages"][-10:])
    prompt = (f"Conversazione finora:\n{history}\n\n" if history else "") + (f"Bozza attuale: {json.dumps(conv.get('draft'), ensure_ascii=False)}\n\n" if conv.get("draft") else "")
    prompt += f"Nuovo messaggio dell'utente: {body.message or '(ha inviato solo una foto)'}"
    if links:
        prompt += "\n\nContenuto dei link (letto automaticamente, può essere parziale):\n" + "\n".join(json.dumps(l, ensure_ascii=False) for l in links)
    if images:
        prompt += "\n\nÈ allegata un'immagine (locandina/foto): leggila con attenzione, inclusi date, orari, luogo e prezzi."
    poster = body.image_url or (links[0]["image"] if links and links[0].get("image") and images else "")
    system = await assistant_system()

    async def gen():
        buf, shown, full = "", 0, []
        try:
            async for ev in new_chat(f"as-{body.session_id}-{len(conv['messages'])}", system).stream_message(user_msg(prompt, images)):
                if isinstance(ev, StreamDone):
                    break
                if not isinstance(ev, TextDelta):
                    continue
                full.append(ev.content)
                buf = "".join(full)
                cut = buf.find(DRAFT_SEP)
                safe = cut if cut >= 0 else max(shown, len(buf) - len(DRAFT_SEP))
                if safe > shown:
                    yield f"data: {json.dumps({'t': 'delta', 'c': buf[shown:safe]})}\n\n"
                    shown = safe
        except Exception as e:
            logger.error(f"AI assistant failed: {e}")
            yield f"data: {json.dumps({'t': 'error', 'c': 'Lucy non è disponibile in questo momento, riprova tra poco.'})}\n\n"
            return
        buf = "".join(full)
        reply, _, tail = buf.partition(DRAFT_SEP)
        if not _ and shown < len(buf):
            yield f"data: {json.dumps({'t': 'delta', 'c': buf[shown:]})}\n\n"
        draft = await clean_draft(parse_json(tail)) if tail else None
        if draft and poster and draft["target"] == "item" and not draft["fields"].get("image_url"):
            draft["fields"]["image_url"] = poster
        if draft and poster and draft["target"] == "post":
            pk = next((x["key"] for x in (await db.sections.find_one({"slug": draft["section"]}) or {}).get("fields", []) if x.get("type") == "photo"), None)
            if pk and not draft["fields"].get(pk):
                draft["fields"][pk] = poster
        draft = draft or conv.get("draft")
        msgs = conv["messages"] + [{"role": "user", "text": body.message or "📷 locandina", "image_url": body.image_url, "at": iso_now()},
                                   {"role": "assistant", "text": reply.strip(), "at": iso_now()}]
        await db.ai_chats.update_one({"session_id": body.session_id, "user_id": user.id},
                                     {"$set": {"messages": msgs[-30:], "draft": draft, "updated_at": iso_now()}}, upsert=True)
        yield f"data: {json.dumps({'t': 'done', 'draft': draft})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------- startup ----------
async def seed_admin():
    a_user, a_email, a_pw = os.environ["ADMIN_USERNAME"], os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"username_lower": a_user.lower()})
    if not existing:
        doc = User(username=a_user, email=a_email, password_hash=hash_pw(a_pw), role="superadmin").to_mongo()
        await db.users.insert_one({**doc, "username_lower": a_user.lower()})
    elif existing.get("role") != "superadmin" or existing.get("blocked"):
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"role": "superadmin", "blocked": False}})


def new_post(sec, data, tag, status="approved", owner=None, owner_name="", created_at=None, reactions=None):
    return {"section": sec["slug"], "data": data, "tag": tag, "title": title_of(sec, data), "status": status, "reject_reason": "",
            "completed": False, "reactions": reactions or {"heart": 0, "eyes": 0, "fire": 0}, "owner_user": owner,
            "owner_name": owner_name, "created_at": created_at or iso_now(), "expires_at": post_expiry(sec, data)}


async def migrate_spotted():
    sec = await db.sections.find_one({"slug": "spotted"})
    async for s in db.spotted.find():
        data = {k: s.get(k, "") for k in ("where", "when", "who", "message")}
        res = await db.posts.insert_one(new_post(sec, data, SPOT_TAG_MAP.get(s.get("tag"), ""), s.get("status", "approved"),
                                                 s.get("owner_user"), "", s.get("created_at"), s.get("reactions")))
        async for r in db.spotted_replies.find({"spotted_id": str(s["_id"])}):
            await db.post_replies.insert_one({"post_id": str(res.inserted_id), "post_title": data["where"], "section": "spotted",
                                              "owner_user": s.get("owner_user"), "from_user": None, "from_name": "ospite",
                                              "message": r["message"], "contact": r["contact"], "read": False, "created_at": r["created_at"]})
    for c in ("spotted", "spotted_replies", "spotted_reactions"):
        await db[c].drop()


async def seed_all():
    if not await db.config.find_one({"_id": "app"}):
        cfg = copy.deepcopy(DEFAULT_CONFIG)
        old = await db.settings.find_one({"_id": "global"})
        if old:
            cfg["trend"]["threshold"] = old.get("threshold", 20)
        await db.config.insert_one(cfg)
    await seed_admin()
    today = datetime.now(ROME).date()
    if await db.items.count_documents({}) == 0:
        items, spotteds = build_seed(today)
        await db.items.insert_many([Item(**i).to_mongo() for i in items])
        await db.spotted.insert_many([{**sp, "created_at": iso_now()} for sp in spotteds])
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many(copy.deepcopy(DEFAULT_CATEGORIES))
    if await db.sections.count_documents({}) == 0:
        await db.sections.insert_many(copy.deepcopy(DEFAULT_SECTIONS))
    if await db.themes.count_documents({}) == 0:
        await db.themes.insert_many(copy.deepcopy(DEFAULT_THEMES))
    await migrate_spotted()
    if await db.posts.count_documents({"section": {"$ne": "spotted"}}) == 0:
        secs = {x["slug"]: x async for x in db.sections.find()}
        await db.posts.insert_many([new_post(secs[slug], data, tag, owner_name="Potenza") for slug, tag, data in seed_posts(today) if slug in secs])
    if await db.polls.count_documents({}) == 0:
        await db.polls.insert_one({**seed_poll(today), "created_at": iso_now()})
    await refresh_kinds()


@app.on_event("startup")
async def startup():
    await db.users.create_index("username_lower", unique=True)
    await db.users.create_index("email", unique=True)
    await db.votes.create_index([("item_id", 1), ("voter", 1)], unique=True)
    await db.votes.create_index("expires_at", expireAfterSeconds=0)
    await db.saves.create_index([("item_id", 1), ("voter", 1)], unique=True)
    await db.post_reactions.create_index([("post_id", 1), ("voter", 1), ("type", 1)], unique=True)
    await db.poll_votes.create_index([("poll_id", 1), ("voter", 1)], unique=True)
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
