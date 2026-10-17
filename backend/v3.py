import csv
import io
import random
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from server import (api, app, db, User, get_identity, need_voter, require_member, require_admin, require_user, get_public_item,
                    present, clean, load_public_items, DATED, oid, iso_now, now_utc, doc_out, get_config, audit, post_out,
                    public_post, public_post_q, EMAIL_RE, client_ip)

LIVE_TAGS = {"pieno": "🔥 Pieno / Molta gente", "parcheggio": "🚗 Parcheggio pieno / Traffico", "fila": "⏳ Fila all'ingresso",
             "musica": "🎶 Musica / Serata top", "avviso": "⚠️ Avviso / Disservizio in zona"}
LIVE_HOURS = 3
FUEL = ("benzina", "diesel", "gpl")


async def throttle(key, n, minutes):
    if await db.rate_limits.count_documents({"key": key, "at": {"$gt": now_utc() - timedelta(minutes=minutes)}}) >= n:
        raise HTTPException(429, "Troppe richieste, riprova più tardi")
    await db.rate_limits.insert_one({"key": key, "at": now_utc()})


# ---------- Potenza Live ----------
class LiveIn(BaseModel):
    tag: str
    zone: str = Field(default="", max_length=80)
    item_id: str = ""
    note: str = Field(default="", max_length=200)


def tz_iso(v):
    return v.replace(tzinfo=v.tzinfo or timezone.utc).isoformat() if isinstance(v, datetime) else v


def live_out(r, uid=None):
    o = doc_out(r)
    o["created_at"], o["expires_at"] = tz_iso(r.get("created_at")), tz_iso(r.get("expires_at"))
    confirms = o.pop("confirms", [])
    owner = o.pop("user_id", None)
    o.update(confirms_count=len(confirms), confirmed=bool(uid) and uid in confirms, mine=bool(uid) and owner == uid,
             tag_label=LIVE_TAGS.get(r["tag"], r["tag"]))
    return o


@api.get("/live/reports")
async def live_reports(request: Request, item_id: str = "", zone: str = "", limit: int = 20):
    ident = await get_identity(request)
    q = {"expires_at": {"$gt": now_utc()}}
    if item_id:
        q["$or"] = [{"item_id": item_id}] + ([{"zone": zone, "item_id": {"$in": ["", None]}}] if zone else [])
    docs = await db.live_reports.find(q).sort("created_at", -1).to_list(min(max(limit, 1), 50))
    uid = ident["user"].id if ident["user"] else None
    return {"tags": LIVE_TAGS, "reports": [live_out(d, uid) for d in docs]}


@api.post("/live/reports")
async def create_live_report(body: LiveIn, user: User = Depends(require_member)):
    if body.tag not in LIVE_TAGS:
        raise HTTPException(422, "Scegli cosa succede")
    doc = {"tag": body.tag, "note": body.note.strip(), "item_id": "", "item_title": "", "zone": body.zone.strip()}
    if body.item_id:
        it = await get_public_item(body.item_id)
        doc.update(item_id=it.id, item_title=it.title, zone=it.zone or it.town)
    else:
        c = await get_config()
        places = {z["name"] for z in c["zones"]} | {t["name"] for t in c["towns"]}
        if doc["zone"] not in places:
            raise HTTPException(422, "Scegli una zona o un luogo")
    await throttle(f"live:{user.id}", 10, 60)
    now = now_utc()
    doc.update(user_id=user.id, username=user.username, confirms=[], created_at=now, expires_at=now + timedelta(hours=LIVE_HOURS))
    res = await db.live_reports.insert_one(doc)
    return live_out({**doc, "_id": res.inserted_id}, user.id)


@api.post("/live/reports/{rid}/confirm")
async def confirm_live(rid: str, user: User = Depends(require_member)):
    r = await db.live_reports.find_one({"_id": oid(rid), "expires_at": {"$gt": now_utc()}})
    if not r:
        raise HTTPException(404, "Segnalazione scaduta")
    if r.get("user_id") == user.id:
        raise HTTPException(400, "Non puoi confermare la tua segnalazione")
    await db.live_reports.update_one({"_id": r["_id"]}, {"$addToSet": {"confirms": user.id}})
    return live_out(await db.live_reports.find_one({"_id": r["_id"]}), user.id)


@api.delete("/live/reports/{rid}")
async def delete_live(rid: str, request: Request):
    ident = await get_identity(request)
    u = ident["user"]
    if not u:
        raise HTTPException(401, "Accesso richiesto")
    q = {"_id": oid(rid)} if u.role in ("admin", "superadmin") else {"_id": oid(rid), "user_id": u.id}
    await db.live_reports.delete_one(q)
    return {"ok": True}


# ---------- Spotlight ----------
class SpotIn(BaseModel):
    status: str = Field(default="", max_length=80)


class WaveIn(BaseModel):
    message: str = Field(default="", max_length=300)


async def here_vote(item_id, user):
    v = await db.votes.find_one({"item_id": item_id, "voter": f"u:{user.id}", "expires_at": {"$gt": now_utc()}})
    return bool(v and v["type"] == "here")


@api.get("/items/{item_id}/spotlight")
async def get_spotlight(item_id: str, request: Request):
    return await spotlight_view((await get_public_item(item_id)).id, (await get_identity(request))["user"])


async def spotlight_view(item_id, user):
    docs = await db.spotlight.find({"item_id": item_id, "expires_at": {"$gt": now_utc()}}).sort("created_at", -1).to_list(100)
    ids = [str(d["_id"]) for d in docs]
    uid = user.id if user else None
    waved = {w["spot_id"] async for w in db.waves.find({"from_user": uid, "spot_id": {"$in": ids}})} if uid else set()
    people = [{"id": str(d["_id"]), "username": d["username"], "status": d.get("status", ""), "since": d["created_at"],
               "me": d["user_id"] == uid, "waved": str(d["_id"]) in waved} for d in docs]
    return {"people": people, "can_join": bool(user) and await here_vote(item_id, user), "joined": any(p["me"] for p in people)}


@api.post("/items/{item_id}/spotlight")
async def join_spotlight(item_id: str, body: SpotIn, user: User = Depends(require_member)):
    it = await get_public_item(item_id)
    if not await here_vote(it.id, user):
        raise HTTPException(400, "Prima premi «Ci sono ORA 📍»")
    await db.spotlight.update_one({"item_id": it.id, "user_id": user.id},
                                  {"$set": {"status": body.status.strip(), "username": user.username, "item_title": it.title,
                                            "expires_at": now_utc() + timedelta(hours=LIVE_HOURS)},
                                   "$setOnInsert": {"created_at": iso_now()}}, upsert=True)
    return await spotlight_view(it.id, user)


@api.delete("/items/{item_id}/spotlight")
async def leave_spotlight(item_id: str, user: User = Depends(require_user)):
    await db.spotlight.delete_many({"item_id": item_id, "user_id": user.id})
    return {"ok": True}


@api.post("/spotlight/{sid}/wave")
async def wave(sid: str, body: WaveIn, user: User = Depends(require_member)):
    s = await db.spotlight.find_one({"_id": oid(sid), "expires_at": {"$gt": now_utc()}})
    if not s:
        raise HTTPException(404, "Questa persona non è più nello Spotlight")
    if s["user_id"] == user.id:
        raise HTTPException(400, "Non puoi salutare te stesso 😄")
    try:
        await db.waves.insert_one({"spot_id": sid, "from_user": user.id, "created_at": iso_now()})
    except DuplicateKeyError:
        raise HTTPException(409, "Hai già mandato un saluto")
    await db.post_replies.insert_one({"post_id": None, "post_title": f"Spotlight ✨ {s.get('item_title', '')}", "section": "spotlight", "kind": "wave",
                                      "owner_user": s["user_id"], "from_user": user.id, "from_name": user.username,
                                      "message": body.message.strip() or "Ti ha mandato un saluto 👋", "contact": "", "read": False,
                                      "created_at": iso_now()})
    return {"ok": True}


@api.get("/spotlight/places")
async def spotlight_places(request: Request, user: User = Depends(require_member)):
    counts = {}
    async for s in db.spotlight.find({"expires_at": {"$gt": now_utc()}}):
        counts[s["item_id"]] = counts.get(s["item_id"], 0) + 1
    items = [i for i in await load_public_items() if i.id in counts]
    pres = await present(items, await get_identity(request))
    for p in pres:
        p["spotlight_count"] = counts[p["id"]]
    pres.sort(key=lambda p: -p["spotlight_count"])
    return [clean(p) for p in pres]


# ---------- Saved posts ----------
@api.post("/posts/{pid}/save")
async def save_post(pid: str, request: Request):
    voter = need_voter(await get_identity(request))
    d = await public_post(pid)
    res = await db.post_saves.delete_one({"post_id": pid, "voter": voter})
    if not res.deleted_count:
        await db.post_saves.insert_one({"post_id": pid, "voter": voter, "created_at": iso_now()})
    return post_out(d, saved=not res.deleted_count)


@api.get("/me/saved-posts")
async def my_saved_posts(request: Request):
    voter = need_voter(await get_identity(request))
    ids = [s["post_id"] async for s in db.post_saves.find({"voter": voter}).sort("created_at", -1)]
    docs = {str(d["_id"]): d for d in await db.posts.find({**public_post_q(), "_id": {"$in": [oid(i) for i in ids]}}).to_list(500)}
    return [post_out(docs[i], saved=True) for i in ids if i in docs]


# ---------- Sorprendimi ----------
@api.get("/surprise")
async def surprise(request: Request):
    pres = await present(await load_public_items(), await get_identity(request))
    pool = [p for p in pres if p["kind"] in DATED and (p["_tonight"] or p["_weekend"])]
    if len(pool) < 6:
        rest = [p for p in pres if p["kind"] not in DATED]
        pool += random.sample(rest, min(max(3, 6 - len(pool)), len(rest)))
    return [clean(p) for p in random.sample(pool, min(3, len(pool)))]


# ---------- Benzina & Info utili ----------
class PriceIn(BaseModel):
    fuel: str
    price: float


def station_out(d):
    o = doc_out(d)
    o["prices"] = {f: (d.get("prices") or {}).get(f) for f in FUEL}
    return o


@api.get("/fuel")
async def fuel_list(sort: str = "benzina"):
    docs = [station_out(d) for d in await db.fuel_stations.find({"hidden": {"$ne": True}}).to_list(200)]
    f = sort if sort in FUEL else "benzina"
    docs.sort(key=lambda s: (s["prices"][f] is None, s["prices"][f] or 0, s.get("order", 0)))
    return docs


@api.post("/fuel/{sid}/price")
async def update_price(sid: str, body: PriceIn, user: User = Depends(require_member)):
    if body.fuel not in FUEL or not 0.5 <= body.price <= 4:
        raise HTTPException(422, "Prezzo non valido (es. 1.789)")
    await throttle(f"fuel:{user.id}", 20, 60)
    res = await db.fuel_stations.update_one({"_id": oid(sid), "hidden": {"$ne": True}},
                                            {"$set": {f"prices.{body.fuel}": round(body.price, 3), "updated_at": iso_now(), "updated_by": user.username}})
    if not res.matched_count:
        raise HTTPException(404, "Distributore non trovato")
    return station_out(await db.fuel_stations.find_one({"_id": oid(sid)}))


@api.get("/info")
async def city_info():
    return [doc_out(d) for d in await db.city_info.find({"hidden": {"$ne": True}}).sort("order", 1).to_list(100)]


SIMPLE = {"fuel": ("fuel_stations", {"name", "brand", "address", "zone", "prices", "hidden", "order"}),
          "promo": ("promos", {"title", "business", "description", "image_url", "valid_until", "link", "zone", "hidden", "order"}),
          "info": ("city_info", {"title", "icon", "body", "link", "hidden", "order"})}


def simple_clean(coll, body):
    if coll not in SIMPLE:
        raise HTTPException(404, "Non trovato")
    d = {k: v for k, v in body.items() if k in SIMPLE[coll][1]}
    if "prices" in d:
        p = d["prices"] if isinstance(d["prices"], dict) else {}
        d["prices"] = {f: (round(float(p[f]), 3) if p.get(f) not in (None, "") else None) for f in FUEL}
        d["updated_at"] = iso_now()
        d["updated_by"] = "redazione"
    if coll == "promo" and d.get("hidden") is False:
        d["pending"] = False
    for k in ("name", "brand", "address", "zone", "title", "icon", "body", "link", "business", "description", "image_url", "valid_until"):
        if k in d:
            d[k] = str(d[k] or "").strip()[:2000]
    return d


@api.get("/admin/simple/{coll}")
async def simple_list(coll: str, a=Depends(require_admin)):
    simple_clean(coll, {})
    return [station_out(d) if coll == "fuel" else doc_out(d) for d in await db[SIMPLE[coll][0]].find().sort("order", 1).to_list(300)]


@api.post("/admin/simple/{coll}")
async def simple_create(coll: str, body: dict, a=Depends(require_admin)):
    d = simple_clean(coll, body)
    if not (d.get("name") or d.get("title")):
        raise HTTPException(422, "Inserisci un nome")
    d.setdefault("hidden", False)
    d.setdefault("order", await db[SIMPLE[coll][0]].count_documents({}))
    await db[SIMPLE[coll][0]].insert_one(d)
    await audit(a, f"crea {coll}", d.get("name") or d.get("title"))
    return {"ok": True}


@api.put("/admin/simple/{coll}/{sid}")
async def simple_update(coll: str, sid: str, body: dict, a=Depends(require_admin)):
    d = simple_clean(coll, body)
    await db[SIMPLE[coll][0]].update_one({"_id": oid(sid)}, {"$set": d})
    return {"ok": True}


@api.delete("/admin/simple/{coll}/{sid}")
async def simple_delete(coll: str, sid: str, a=Depends(require_admin)):
    simple_clean(coll, {})
    await db[SIMPLE[coll][0]].delete_one({"_id": oid(sid)})
    await audit(a, f"elimina {coll}", sid)
    return {"ok": True}


# ---------- Promozioni & Volantini ----------
class PromoIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    business: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=1000)
    image_url: str = Field(default="", max_length=500)
    valid_until: str = Field(default="", max_length=10)
    link: str = Field(default="", max_length=300)
    zone: str = Field(default="", max_length=80)


@api.get("/promos")
async def promos():
    today = datetime.now(timezone.utc).date().isoformat()
    q = {"hidden": {"$ne": True}, "$or": [{"valid_until": {"$in": ["", None]}}, {"valid_until": {"$gte": today}}]}
    return [doc_out(d) for d in await db.promos.find(q).sort([("order", 1), ("_id", -1)]).to_list(200)]


@api.post("/promos")
async def create_promo(body: PromoIn, user: User = Depends(require_member)):
    await throttle(f"promo:{user.id}", 5, 60)
    admin = user.role in ("admin", "superadmin")
    d = simple_clean("promo", body.model_dump())
    d.update(hidden=not admin, pending=not admin, order=0, by_user=user.username, created_at=iso_now())
    await db.promos.insert_one(d)
    return {"ok": True, "status": "approved" if admin else "pending"}


# ---------- Bacheca: i più cliccati ----------
@api.post("/posts/{pid}/view")
async def post_view(pid: str, request: Request):
    voter = need_voter(await get_identity(request))
    d = await public_post(pid)
    try:
        await db.post_views.insert_one({"post_id": pid, "voter": voter})
        await db.posts.update_one({"_id": d["_id"]}, {"$inc": {"views": 1}})
    except DuplicateKeyError:
        pass
    return {"ok": True}


@api.get("/board-top")
async def board_top(limit: int = 5):
    secs = {s["slug"]: s async for s in db.sections.find({"hidden": {"$ne": True}})}
    docs = await db.posts.find({**public_post_q(), "section": {"$in": list(secs)}}).sort([("views", -1), ("created_at", -1)]).to_list(min(max(limit, 1), 10))
    out = []
    for d in docs:
        o = post_out(d)
        o.update(views=d.get("views", 0), section_name=secs[d["section"]]["name"], section_color=secs[d["section"]].get("color", ""),
                 section_icon=secs[d["section"]].get("icon", ""))
        out.append(o)
    return out


# ---------- Proposte, contatti, newsletter ----------
class ProposalIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=600)
    area: str = Field(default="altro", max_length=20)
    contact: str = Field(default="", max_length=120)


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=120)
    phone: str = Field(default="", max_length=40)
    kind: str = Field(default="info", max_length=20)
    message: str = Field(min_length=5, max_length=2000)


class NewsIn(BaseModel):
    email: str = Field(max_length=120)


class OnIn(BaseModel):
    on: bool


async def who(request):
    ident = await get_identity(request)
    return ident["user"].username if ident["user"] else "ospite"


@api.post("/proposals")
async def propose(body: ProposalIn, request: Request):
    await throttle(f"prop:{client_ip(request)}", 5, 60)
    await db.proposals.insert_one({**body.model_dump(), "by_user": await who(request), "status": "new", "created_at": iso_now()})
    return {"ok": True}


@api.post("/contact")
async def contact(body: ContactIn, request: Request):
    if not EMAIL_RE.match(body.email.strip()):
        raise HTTPException(422, "Email non valida")
    await throttle(f"contact:{client_ip(request)}", 5, 60)
    kind = body.kind if body.kind in ("info", "pubblicita", "collabora") else "info"
    await db.contacts.insert_one({**body.model_dump(), "kind": kind, "email": body.email.strip().lower(), "by_user": await who(request),
                                  "status": "new", "created_at": iso_now()})
    return {"ok": True}


@api.post("/newsletter")
async def subscribe(body: NewsIn, request: Request):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Email non valida")
    await throttle(f"news:{client_ip(request)}", 10, 60)
    await db.newsletter.update_one({"email": email}, {"$setOnInsert": {"email": email, "created_at": iso_now()}}, upsert=True)
    return {"ok": True}


@api.get("/me/newsletter")
async def my_newsletter(user: User = Depends(require_user)):
    return {"on": bool(await db.newsletter.find_one({"email": user.email}))}


@api.put("/me/newsletter")
async def set_newsletter(body: OnIn, user: User = Depends(require_user)):
    if body.on:
        await db.newsletter.update_one({"email": user.email}, {"$set": {"user_id": user.id}, "$setOnInsert": {"email": user.email, "created_at": iso_now()}}, upsert=True)
    else:
        await db.newsletter.delete_one({"email": user.email})
    return {"on": body.on}


INBOX = {"proposals": "proposals", "contacts": "contacts", "newsletter": "newsletter"}


@api.get("/admin/inbox")
async def admin_inbox(a=Depends(require_admin)):
    return {k: [doc_out(d) for d in await db[c].find().sort("created_at", -1).to_list(2000)] for k, c in INBOX.items()}


@api.post("/admin/inbox/{kind}/{iid}/done")
async def admin_inbox_done(kind: str, iid: str, a=Depends(require_admin)):
    if kind not in ("proposals", "contacts"):
        raise HTTPException(404, "Non trovato")
    d = await db[kind].find_one({"_id": oid(iid)})
    if not d:
        raise HTTPException(404, "Non trovato")
    await db[kind].update_one({"_id": d["_id"]}, {"$set": {"status": "new" if d.get("status") == "done" else "done"}})
    return {"ok": True}


@api.delete("/admin/inbox/{kind}/{iid}")
async def admin_inbox_delete(kind: str, iid: str, a=Depends(require_admin)):
    if kind not in INBOX:
        raise HTTPException(404, "Non trovato")
    await db[INBOX[kind]].delete_one({"_id": oid(iid)})
    return {"ok": True}


@api.get("/admin/newsletter.csv")
async def admin_newsletter_csv(a=Depends(require_admin)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "iscritto_il"])
    async for d in db.newsletter.find().sort("created_at", 1):
        w.writerow([d["email"], d.get("created_at", "")])
    await audit(a, "esporta newsletter")
    return Response(content=buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=newsletter-iscritti.csv"})


# ---------- seed & migrations ----------
STATIONS = [
    ("Q8 Gallitello", "Q8", "Via del Gallitello 120", "Gallitello", 1.789, 1.699, 0.749),
    ("Eni Viale Marconi", "Eni", "Viale Guglielmo Marconi 54", "Centro", 1.829, 1.739, 0.769),
    ("IP Macchia Romana", "IP", "Viale dell'Ateneo Lucano 12", "Macchia Romana", 1.774, 1.689, None),
    ("Tamoil Via Appia", "Tamoil", "Via Appia 210", "Rione Lucania", 1.759, 1.672, 0.739),
    ("Esso Tito Scalo", "Esso", "Zona Industriale, Tito Scalo", "Tito Scalo", 1.749, 1.665, 0.729),
]
INFO = [
    ("Scale Mobili", "TrainFront", "Le scale mobili collegano Santa Lucia, Prima e Basento al centro storico. Orario indicativo: tutti i giorni 7:00–21:00 (estate fino a mezzanotte nel weekend). Verifica eventuali chiusure per manutenzione.", ""),
    ("Guardia Medica", "Stethoscope", "Continuità assistenziale attiva di notte (20:00–8:00), nei weekend e nei festivi. Per le emergenze chiama sempre il 118.", "tel:118"),
    ("Farmacie di turno", "Pill", "Le farmacie di turno cambiano ogni giorno: controlla l'elenco aggiornato prima di uscire.", "https://www.farmaciediturno.org/provincia.asp?cod=76"),
    ("Parcheggi consigliati", "SquareParking", "Per il centro: parcheggio Santa Lucia (scale mobili), Prima (Viale Marconi) e Via Armellini. Il Gallitello ha ampi parcheggi gratuiti.", ""),
]


PROMOS = [
    ("-20% su tutta la spesa del sabato", "Supermercato Gallitello", "Ogni sabato sconto del 20% su frutta, verdura e prodotti lucani a km 0. Presenta l'app alla cassa.", "Gallitello",
     "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900"),
    ("Aperitivo 2x1 dalle 18 alle 20", "Bar Pretoria 1870", "Spritz e calici di Aglianico del Vulture 2x1 con tagliere lucano, dal lunedì al giovedì.", "Centro Storico",
     "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=900"),
    ("Volantino saldi: fino al -50%", "Moda Basento Outlet", "Saldi di stagione su abbigliamento e scarpe: fino al -50% e un ulteriore 10% per gli studenti UNIBAS.", "Viale del Basento",
     "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900"),
]


async def seed_v3():
    await db.post_views.create_index([("post_id", 1), ("voter", 1)], unique=True)
    await db.sections.update_one({"slug": "spotted", "fields.key": "where"},
                                 {"$set": {"fields": [{"key": "message", "label": "Messaggio", "type": "textarea", "required": True, "options": []}]}})
    if not await db.city_info.find_one({"title": "Numeri utili"}):
        await db.city_info.insert_one({"title": "Numeri utili", "icon": "Phone", "body": "Emergenze 112 · Ambulanza 118 · Vigili del Fuoco 115 · Polizia Locale Potenza 0971 415 300 · Taxi Potenza 0971 410 410", "link": "tel:112", "hidden": False, "order": 9})
    if not await db.promos.count_documents({}):
        until = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
        await db.promos.insert_many([{"title": t, "business": b, "description": ds, "zone": z, "image_url": im, "valid_until": until, "link": "",
                                      "hidden": False, "pending": False, "order": i, "by_user": "redazione", "created_at": iso_now()}
                                     for i, (t, b, ds, z, im) in enumerate(PROMOS)])
    for c in ("live_reports", "spotlight"):
        await db[c].create_index("expires_at", expireAfterSeconds=0)
    await db.spotlight.create_index([("item_id", 1), ("user_id", 1)], unique=True)
    await db.waves.create_index([("spot_id", 1), ("from_user", 1)], unique=True)
    await db.post_saves.create_index([("post_id", 1), ("voter", 1)], unique=True)
    await db.newsletter.create_index("email", unique=True)
    await db.rate_limits.create_index("at", expireAfterSeconds=7200)
    await db.config.update_one({"_id": "app", "texts.going_label": "Ci sarò stasera 👋"}, {"$set": {"texts.going_label": "Ci sarò 👋"}})
    await db.config.update_one({"_id": "app", "home.blocks": {"$elemMatch": {"id": "trending", "label": "Dove va Potenza stasera"}}},
                               {"$set": {"home.blocks.$.label": "Classifica Live"}})
    if not await db.fuel_stations.count_documents({}):
        await db.fuel_stations.insert_many([{"name": n, "brand": b, "address": ad, "zone": z, "prices": {"benzina": p1, "diesel": p2, "gpl": p3},
                                             "updated_at": iso_now(), "updated_by": "community", "hidden": False, "order": i}
                                            for i, (n, b, ad, z, p1, p2, p3) in enumerate(STATIONS)])
    if not await db.city_info.count_documents({}):
        await db.city_info.insert_many([{"title": t, "icon": ic, "body": b, "link": lk, "hidden": False, "order": i} for i, (t, ic, b, lk) in enumerate(INFO)])
    await db.live_reports.delete_many({"seed": True})
    now = now_utc()
    venue = await db.items.find_one({"status": "approved", "kind": "venue"})
    seeds = [{"tag": "musica", "zone": "Centro Storico", "note": "Bella atmosfera in Via Pretoria, tanta gente fuori dai locali", "item_id": "", "item_title": "",
              "created_at": now - timedelta(minutes=20)},
             {"tag": "parcheggio", "zone": "Gallitello", "note": "Parcheggi quasi tutti occupati", "item_id": "", "item_title": "",
              "created_at": now - timedelta(minutes=45)}]
    if venue:
        seeds[0].update(item_id=str(venue["_id"]), item_title=venue["title"], zone=venue.get("zone") or "Centro Storico", tag="pieno")
    await db.live_reports.insert_many([{**s, "user_id": None, "username": "Redazione", "confirms": [], "seed": True,
                                        "expires_at": s["created_at"] + timedelta(hours=LIVE_HOURS)} for s in seeds])


@app.on_event("startup")
async def startup_v3():
    await seed_v3()
