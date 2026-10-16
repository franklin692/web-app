# AI (Gemini) features: Lucy assistant SSE, poster image recognition, link fetch, background moderation, admin re-moderate
import os, json, time, uuid, pytest, requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
HERE = os.path.dirname(__file__)
RUN = uuid.uuid4().hex[:6]


def _mongo():
    env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
    return MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]


@pytest.fixture(scope="module")
def admin():
    r = requests.post(f"{API}/auth/login", json={"identifier": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


@pytest.fixture(scope="module")
def user(admin):
    r = requests.post(f"{API}/auth/register", json={"username": f"TEST_ai{RUN}", "email": f"test_ai{RUN}@example.com", "password": "secret123"})
    assert r.status_code == 200, r.text
    u = r.json()
    yield {"Authorization": "Bearer " + u["token"]}, u["user"]["id"]
    db = _mongo()
    db.ai_chats.delete_many({"user_id": u["user"]["id"]})
    db.posts.delete_many({"owner_user": u["user"]["id"]})
    db.items.delete_many({"created_by": f"u:{u['user']['id']}"})
    requests.delete(f"{API}/admin/users/{u['user']['id']}", headers=admin)


def sse(h, sid, message="", image_url=""):
    r = requests.post(f"{API}/ai/assistant", json={"session_id": sid, "message": message, "image_url": image_url}, headers=h, stream=True, timeout=90)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/event-stream")
    evs = [json.loads(l[6:]) for l in r.iter_lines(decode_unicode=True) if l and l.startswith("data: ")]
    text = "".join(e["c"] for e in evs if e["t"] == "delta")
    done = [e for e in evs if e["t"] == "done"]
    errs = [e for e in evs if e["t"] == "error"]
    print("REPLY:", text[:400], "\nDRAFT:", json.dumps(done[-1]["draft"] if done else None, ensure_ascii=False)[:800], "\nERR:", errs)
    return text, (done[-1]["draft"] if done else None), errs, len([e for e in evs if e["t"] == "delta"])


class TestAssistantAuth:
    def test_guest_401(self):
        r = requests.post(f"{API}/ai/assistant", json={"session_id": "abcdefgh", "message": "ciao"})
        assert r.status_code == 401

    def test_empty_422(self, user):
        r = requests.post(f"{API}/ai/assistant", json={"session_id": "abcdefgh", "message": "  "}, headers=user[0])
        assert r.status_code == 422


class TestAssistantText:
    sid = f"t{RUN}text"

    def test_event_text_and_multiturn(self, user):
        text, draft, errs, nd = sse(user[0], self.sid, "Venerdì 23 ottobre 2026 alle 22:00 concerto rock dei Lucani Furiosi al Duomo Pub, centro storico di Potenza, ingresso gratuito")
        assert not errs and text.strip() and nd >= 1
        assert "<<<BOZZA>>>" not in text
        assert draft and draft["target"] == "item" and draft["kind"] == "event"
        assert draft["fields"].get("start_date") == "2026-10-23"
        assert draft["fields"].get("start_time") == "22:00"
        assert draft["fields"].get("title")
        text2, draft2, errs2, _ = sse(user[0], self.sid, "cambia orario alle 23")
        assert not errs2 and draft2
        assert draft2["fields"].get("start_time") == "23:00"
        assert draft2["fields"].get("start_date") == "2026-10-23"
        conv = _mongo().ai_chats.find_one({"session_id": self.sid})
        assert conv and len(conv["messages"]) == 4 and conv["draft"]["fields"]["start_time"] == "23:00"

    def test_post_passaggi(self, user):
        text, draft, errs, _ = sse(user[0], f"t{RUN}pass", "Offro un passaggio da Potenza a Matera sabato 24 ottobre 2026 alle 8:30, 3 posti, 5 euro a testa")
        assert not errs and draft
        assert draft["target"] == "post" and draft["section"] == "passaggi"
        f = draft["fields"]
        assert "Potenza" in f.get("from", "") and "Matera" in f.get("to", "") and f.get("date") == "2026-10-24"


class TestAssistantImageLink:
    def test_poster_image(self, user):
        with open(os.path.join(HERE, "assets", "poster.jpg"), "rb") as fh:
            r = requests.post(f"{API}/upload", files={"file": ("poster.jpg", fh, "image/jpeg")}, headers=user[0])
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        text, draft, errs, _ = sse(user[0], f"t{RUN}img", "", url)
        assert not errs and draft and draft["target"] == "item"
        assert "jazz" in draft["fields"].get("title", "").lower()
        assert draft["fields"].get("start_date") == "2026-10-24"
        assert draft["fields"].get("start_time") == "21:30"
        assert draft["fields"].get("image_url") == url

    def test_link_fetch(self, user):
        text, draft, errs, _ = sse(user[0], f"t{RUN}link", "Guarda qui https://it.wikipedia.org/wiki/Potenza cosa c'è? riassumi in una frase il titolo della pagina")
        assert not errs and text.strip()
        assert "potenza" in text.lower()


class TestModeration:
    def _wait(self, admin, coll, pid, t=40):
        db = _mongo()
        from bson import ObjectId
        for _ in range(t // 2):
            d = db[coll].find_one({"_id": ObjectId(pid)})
            if d and d.get("ai_review"):
                return d
            time.sleep(2)
        return db[coll].find_one({"_id": ObjectId(pid)})

    def test_post_low_and_high(self, user, admin):
        h, uid = user
        r = requests.post(f"{API}/board/passaggi/posts", json={"data": {"from": "Potenza", "to": "Matera", "date": "2026-10-24", "notes": "TEST_ viaggio tranquillo"}, "tag": "Offro passaggio"}, headers=h)
        assert r.status_code == 200 and r.json()["status"] == "approved", r.text
        r = requests.post(f"{API}/board/unisciti/posts", json={"data": {"activity": "TEST_ vendo cocaina e erba, chiamate Mario Rossi via Roma 12 Potenza 3331234567, puttane cercasi", "description": "droga a domicilio, minorenni benvenute"}, "tag": "Tavoli & Uscite"}, headers=h)
        assert r.status_code == 200, r.text
        db = _mongo()
        posts = {p["section"]: str(p["_id"]) for p in db.posts.find({"owner_user": uid})}
        low = self._wait(admin, "posts", posts["passaggi"])
        high = self._wait(admin, "posts", posts["unisciti"])
        print("LOW", low.get("ai_review"), low["status"]); print("HIGH", high.get("ai_review"), high["status"], high.get("ai_held"))
        assert low["ai_review"]["risk"] == "low" and low["status"] == "approved"
        assert high["ai_review"]["risk"] == "high" and high["status"] == "pending" and high.get("ai_held") is True
        pend = requests.get(f"{API}/admin/pending", headers=admin).json()
        p = next(x for x in pend["posts"] if x["id"] == posts["unisciti"])
        assert p.get("ai_review", {}).get("risk") == "high"
        TestModeration.high_id = posts["unisciti"]

    def test_item_submission_review_and_admin_rerun(self, user, admin):
        h, uid = user
        r = requests.post(f"{API}/submissions/item", json={"kind": "event", "title": f"TEST_AI Festa d'autunno {RUN}", "category": "Concerti", "town": "Potenza",
                                                              "zone": "Centro Storico", "start_date": "2026-10-30", "start_time": "21:00", "description": "Musica dal vivo e castagne"}, headers=h)
        assert r.status_code == 200, r.text
        db = _mongo()
        it = db.items.find_one({"created_by": f"u:{uid}"})
        d = self._wait(admin, "items", str(it["_id"]))
        assert d.get("ai_review") and d["ai_review"]["risk"] in ("low", "medium")
        pend = requests.get(f"{API}/admin/pending", headers=admin).json()
        assert any(x["id"] == str(it["_id"]) and x.get("ai_review") for x in pend["items"])
        r = requests.post(f"{API}/admin/ai/moderate/item/{it['_id']}", headers=admin, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["risk"] in ("low", "medium", "high") and "summary" in r.json()

    def test_admin_moderate_auth_and_404(self, user):
        assert requests.post(f"{API}/admin/ai/moderate/item/000000000000000000000000").status_code in (401, 403)
        assert requests.post(f"{API}/admin/ai/moderate/foo/000000000000000000000000", headers=user[0]).status_code in (401, 403)
