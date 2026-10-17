# v3 features: Potenza Live, Spotlight, Benzina & Info, Proposte/Contatti/Newsletter, saved posts, reports, archive, surprise, AI removal
import os
import uuid
from datetime import date, timedelta
import pytest
import requests
import pymongo

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"
RUN = uuid.uuid4().hex[:6]
MDB = pymongo.MongoClient("mongodb://localhost:27017")["test_database"]


def H(tok=None, dev=None):
    h = {"Content-Type": "application/json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    if dev:
        h["X-Device-Id"] = dev
    return h


def reg(name, news=False):
    r = requests.post(f"{BASE_URL}/auth/register", json={"username": f"TEST_{name}_{RUN}", "email": f"test_{name}_{RUN}@ex.com",
                                                          "password": "secret123", "newsletter": news})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def ctx():
    at = requests.post(f"{BASE_URL}/auth/login", json={"identifier": "admin", "password": "admin123"}).json()["token"]
    a, b, n = reg("v3a"), reg("v3b"), reg("v3n", news=True)
    venue = requests.get(f"{BASE_URL}/items?kind=venue").json()[0]
    c = {"admin": at, "a": a["token"], "b": b["token"], "a_name": a["user"]["username"], "b_id": b["user"]["id"],
         "users": [a["user"]["id"], b["user"]["id"], n["user"]["id"]], "n_email": n["user"]["email"], "venue": venue, "items": []}
    yield c
    for iid in c["items"]:
        requests.delete(f"{BASE_URL}/admin/items/{iid}", headers=H(at))
    for uid in c["users"]:
        requests.delete(f"{BASE_URL}/admin/users/{uid}", headers=H(at))
    MDB.live_reports.delete_many({"username": {"$regex": f"^TEST_.*_{RUN}$"}})
    MDB.spotlight.delete_many({"username": {"$regex": f"^TEST_.*_{RUN}$"}})
    MDB.newsletter.delete_many({"email": {"$regex": f"_{RUN}@"}})
    MDB.proposals.delete_many({"name": {"$regex": f"TEST_.*{RUN}"}})
    MDB.contacts.delete_many({"name": {"$regex": f"TEST_.*{RUN}"}})
    MDB.reports.delete_many({"reason": {"$regex": f"TEST_{RUN}"}})
    MDB.post_replies.delete_many({"from_name": {"$regex": f"^TEST_.*_{RUN}$"}})
    MDB.votes.delete_many({"voter": {"$in": [f"u:{u}" for u in c["users"]]}})


class TestHomeLive:
    def test_home_live_upcoming(self):
        d = requests.get(f"{BASE_URL}/home").json()
        assert isinstance(d["live"], list) and isinstance(d["upcoming"], list)
        lim = (date.today() + timedelta(days=8)).isoformat()
        for p in d["upcoming"]:
            if p["kind"] == "event":
                assert p["start_iso"][:10] <= lim and not p.get("live")

    def test_live_reports_flow(self, ctx):
        d = requests.get(f"{BASE_URL}/live/reports").json()
        assert "tags" in d and len(d["tags"]) == 5 and isinstance(d["reports"], list)
        zone = requests.get(f"{BASE_URL}/config").json()["zones"][0]
        assert requests.post(f"{BASE_URL}/live/reports", json={"tag": "fila", "zone": zone}).status_code == 401
        assert requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "fila", "zone": "Nowhere_X"}).status_code == 422
        assert requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "bad", "zone": zone}).status_code == 422
        r = requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "fila", "zone": zone, "note": "TEST note"})
        assert r.status_code == 200, r.text
        rep = r.json()
        assert rep["zone"] == zone and rep["mine"] and rep["confirms_count"] == 0 and "user_id" not in rep
        rid = rep["id"]
        assert requests.post(f"{BASE_URL}/live/reports/{rid}/confirm", headers=H(ctx["a"])).status_code == 400
        assert requests.post(f"{BASE_URL}/live/reports/{rid}/confirm").status_code == 401
        c1 = requests.post(f"{BASE_URL}/live/reports/{rid}/confirm", headers=H(ctx["b"])).json()
        c2 = requests.post(f"{BASE_URL}/live/reports/{rid}/confirm", headers=H(ctx["b"])).json()
        assert c1["confirms_count"] == 1 and c2["confirms_count"] == 1 and c2["confirmed"]
        # item-linked report
        r2 = requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "pieno", "item_id": ctx["venue"]["id"]}).json()
        assert r2["item_id"] == ctx["venue"]["id"] and r2["item_title"] == ctx["venue"]["title"]
        lst = requests.get(f"{BASE_URL}/live/reports?item_id={ctx['venue']['id']}").json()["reports"]
        assert any(x["id"] == r2["id"] for x in lst)


class TestSpotlight:
    def test_spotlight_flow(self, ctx):
        vid = ctx["venue"]["id"]
        gs = requests.get(f"{BASE_URL}/items/{vid}/spotlight")  # v3.1: public read-only for guests
        assert gs.status_code == 200 and gs.json()["can_join"] is False and isinstance(gs.json()["people"], list)
        assert requests.post(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["a"]), json={"status": "x"}).status_code == 400
        v = requests.post(f"{BASE_URL}/items/{vid}/vote", headers=H(ctx["a"]), json={"type": "here"}).json()
        assert v["my_vote"] == "here"
        j = requests.post(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["a"]), json={"status": "TEST al bancone"})
        assert j.status_code == 200 and j.json()["joined"] and j.json()["can_join"]
        g = requests.get(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["b"])).json()
        me = [p for p in g["people"] if p["username"] == ctx["a_name"]]
        assert me and me[0]["status"] == "TEST al bancone" and not g["can_join"]
        sid = me[0]["id"]
        assert requests.post(f"{BASE_URL}/spotlight/{sid}/wave", headers=H(ctx["a"]), json={}).status_code == 400
        assert requests.post(f"{BASE_URL}/spotlight/{sid}/wave", headers=H(ctx["b"]), json={"message": "ciao!"}).status_code == 200
        assert requests.post(f"{BASE_URL}/spotlight/{sid}/wave", headers=H(ctx["b"]), json={}).status_code == 409
        inbox = requests.get(f"{BASE_URL}/me/inbox", headers=H(ctx["a"])).json()
        assert any(m.get("kind") == "wave" and m["message"] == "ciao!" for m in inbox)
        assert requests.get(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["b"])).json()["people"][0]["waved"] in (True, False)
        places = requests.get(f"{BASE_URL}/spotlight/places", headers=H(ctx["b"]))
        assert places.status_code == 200 and any(p["id"] == vid and p["spotlight_count"] >= 1 for p in places.json())
        assert requests.get(f"{BASE_URL}/spotlight/places").status_code == 401
        # un-vote here removes from spotlight
        requests.post(f"{BASE_URL}/items/{vid}/vote", headers=H(ctx["a"]), json={"type": "here"})
        g2 = requests.get(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["b"])).json()
        assert not any(p["username"] == ctx["a_name"] for p in g2["people"])


class TestFuelInfo:
    def test_fuel_sort_and_price(self, ctx):
        for f in ("benzina", "diesel", "gpl"):
            d = requests.get(f"{BASE_URL}/fuel?sort={f}").json()
            vals = [s["prices"][f] for s in d if s["prices"][f] is not None]
            assert vals == sorted(vals) and len(d) >= 5
            nones = [i for i, s in enumerate(d) if s["prices"][f] is None]
            assert all(i >= len(vals) for i in nones)
        st = requests.get(f"{BASE_URL}/fuel").json()[0]
        assert requests.post(f"{BASE_URL}/fuel/{st['id']}/price", json={"fuel": "diesel", "price": 1.7}).status_code == 401
        for bad in ({"fuel": "diesel", "price": 0.3}, {"fuel": "diesel", "price": 4.5}, {"fuel": "kero", "price": 1.7}):
            assert requests.post(f"{BASE_URL}/fuel/{st['id']}/price", headers=H(ctx["a"]), json=bad).status_code == 422
        old = st["prices"]["diesel"]
        r = requests.post(f"{BASE_URL}/fuel/{st['id']}/price", headers=H(ctx["a"]), json={"fuel": "diesel", "price": 1.7234}).json()
        assert r["prices"]["diesel"] == 1.723 and r["updated_by"] == ctx["a_name"]
        requests.put(f"{BASE_URL}/admin/simple/fuel/{st['id']}", headers=H(ctx["admin"]), json={"prices": {**st["prices"], "diesel": old}})

    def test_info_and_admin_crud(self, ctx):
        assert len(requests.get(f"{BASE_URL}/info").json()) >= 4
        assert requests.get(f"{BASE_URL}/admin/simple/fuel", headers=H(ctx["a"])).status_code == 401
        ah = H(ctx["admin"])
        assert requests.post(f"{BASE_URL}/admin/simple/fuel", headers=ah, json={"name": f"TEST_St_{RUN}", "prices": {"benzina": "1.5", "diesel": "", "gpl": None}}).json()["ok"]
        st = [s for s in requests.get(f"{BASE_URL}/fuel").json() if s["name"] == f"TEST_St_{RUN}"][0]
        assert st["prices"] == {"benzina": 1.5, "diesel": None, "gpl": None}
        requests.put(f"{BASE_URL}/admin/simple/fuel/{st['id']}", headers=ah, json={"hidden": True})
        assert not any(s["id"] == st["id"] for s in requests.get(f"{BASE_URL}/fuel").json())
        requests.delete(f"{BASE_URL}/admin/simple/fuel/{st['id']}", headers=ah)
        assert not any(s["id"] == st["id"] for s in requests.get(f"{BASE_URL}/admin/simple/fuel", headers=ah).json())
        requests.post(f"{BASE_URL}/admin/simple/info", headers=ah, json={"title": f"TEST_Info_{RUN}", "body": "b"})
        inf = [i for i in requests.get(f"{BASE_URL}/info").json() if i["title"] == f"TEST_Info_{RUN}"][0]
        requests.put(f"{BASE_URL}/admin/simple/info/{inf['id']}", headers=ah, json={"body": "updated"})
        assert [i for i in requests.get(f"{BASE_URL}/info").json() if i["id"] == inf["id"]][0]["body"] == "updated"
        requests.delete(f"{BASE_URL}/admin/simple/info/{inf['id']}", headers=ah)
        assert requests.get(f"{BASE_URL}/admin/simple/bogus", headers=ah).status_code == 404


class TestInbox:
    def test_proposal_contact_newsletter(self, ctx):
        assert requests.post(f"{BASE_URL}/proposals", json={"name": f"TEST_Prop_{RUN}", "description": "d"}).json()["ok"]
        assert requests.post(f"{BASE_URL}/proposals", json={"name": "x"}).status_code == 422
        assert requests.post(f"{BASE_URL}/contact", json={"name": f"TEST_C_{RUN}", "email": "bad", "message": "hello world"}).status_code == 422
        assert requests.post(f"{BASE_URL}/contact", json={"name": f"TEST_C_{RUN}", "email": f"c_{RUN}@ex.com", "message": "hello world", "kind": "collabora"}).json()["ok"]
        assert requests.post(f"{BASE_URL}/newsletter", json={"email": f"Guest_{RUN}@Ex.com"}).json()["ok"]
        assert requests.post(f"{BASE_URL}/newsletter", json={"email": f"guest_{RUN}@ex.com"}).json()["ok"]
        assert requests.post(f"{BASE_URL}/newsletter", json={"email": "nope"}).status_code == 422
        inbox = requests.get(f"{BASE_URL}/admin/inbox", headers=H(ctx["admin"])).json()
        p = [x for x in inbox["proposals"] if x["name"] == f"TEST_Prop_{RUN}"][0]
        c = [x for x in inbox["contacts"] if x["name"] == f"TEST_C_{RUN}"][0]
        emails = [x["email"] for x in inbox["newsletter"]]
        assert emails.count(f"guest_{RUN}@ex.com") == 1 and ctx["n_email"] in emails and c["kind"] == "collabora"
        assert requests.get(f"{BASE_URL}/admin/inbox", headers=H(ctx["a"])).status_code == 401
        requests.post(f"{BASE_URL}/admin/inbox/proposals/{p['id']}/done", headers=H(ctx["admin"]))
        inbox = requests.get(f"{BASE_URL}/admin/inbox", headers=H(ctx["admin"])).json()
        assert [x for x in inbox["proposals"] if x["id"] == p["id"]][0]["status"] == "done"
        csv = requests.get(f"{BASE_URL}/admin/newsletter.csv", headers=H(ctx["admin"]))
        assert csv.status_code == 200 and "text/csv" in csv.headers["content-type"] and f"guest_{RUN}@ex.com" in csv.text
        requests.delete(f"{BASE_URL}/admin/inbox/proposals/{p['id']}", headers=H(ctx["admin"]))
        requests.delete(f"{BASE_URL}/admin/inbox/contacts/{c['id']}", headers=H(ctx["admin"]))
        inbox = requests.get(f"{BASE_URL}/admin/inbox", headers=H(ctx["admin"])).json()
        assert not any(x["id"] == p["id"] for x in inbox["proposals"])

    def test_me_newsletter(self, ctx):
        assert requests.get(f"{BASE_URL}/me/newsletter").status_code == 401
        assert requests.get(f"{BASE_URL}/me/newsletter", headers=H(ctx["a"])).json()["on"] is False
        assert requests.put(f"{BASE_URL}/me/newsletter", headers=H(ctx["a"]), json={"on": True}).json()["on"]
        assert requests.get(f"{BASE_URL}/me/newsletter", headers=H(ctx["a"])).json()["on"] is True
        requests.put(f"{BASE_URL}/me/newsletter", headers=H(ctx["a"]), json={"on": False})
        assert requests.get(f"{BASE_URL}/me/newsletter", headers=H(ctx["a"])).json()["on"] is False


class TestMisc:
    def test_post_save_toggle(self, ctx):
        secs = requests.get(f"{BASE_URL}/config").json()["sections"]
        post = None
        for s in secs:
            ps = requests.get(f"{BASE_URL}/board/{s['slug']}").json()["posts"]
            if ps:
                post = ps[0]
                break
        assert post
        r = requests.post(f"{BASE_URL}/posts/{post['id']}/save", headers=H(ctx["a"])).json()
        assert r["saved"] is True
        assert any(p["id"] == post["id"] and p["saved"] for p in requests.get(f"{BASE_URL}/me/saved-posts", headers=H(ctx["a"])).json())
        assert requests.post(f"{BASE_URL}/posts/{post['id']}/save", headers=H(ctx["a"])).json()["saved"] is False
        assert requests.get(f"{BASE_URL}/me/saved-posts", headers=H(ctx["a"])).json() == []
        dev = f"TEST-dev-{RUN}"
        assert requests.post(f"{BASE_URL}/posts/{post['id']}/save", headers=H(dev=dev)).json()["saved"] is True
        requests.post(f"{BASE_URL}/posts/{post['id']}/save", headers=H(dev=dev))

    def test_guest_report_and_resolve(self, ctx):
        vid = ctx["venue"]["id"]
        r = requests.post(f"{BASE_URL}/reports", headers=H(dev=f"TEST-dev-{RUN}"), json={"target_type": "item", "target_id": vid, "reason": f"info: TEST_{RUN}"})
        assert r.status_code == 200
        reps = requests.get(f"{BASE_URL}/admin/reports", headers=H(ctx["admin"])).json()
        rep = [x for x in reps if x["reason"] == f"info: TEST_{RUN}"][0]
        assert rep["by_user"] == "ospite"
        assert requests.post(f"{BASE_URL}/admin/reports/{rep['id']}/action", headers=H(ctx["admin"]), json={"action": "resolve"}).status_code == 200
        res = requests.get(f"{BASE_URL}/admin/reports?status=resolved", headers=H(ctx["admin"])).json()
        assert any(x["id"] == rep["id"] for x in res)
        assert requests.get(f"{BASE_URL}/items/{vid}").status_code == 200  # resolve doesn't hide

    def test_archive_expired_events(self, ctx):
        ah = H(ctx["admin"])
        past = (date.today() - timedelta(days=3)).isoformat()
        it = requests.post(f"{BASE_URL}/admin/items", headers=ah, json={"kind": "event", "title": f"TEST_Past_{RUN}", "start_date": past, "start_time": "21:00"}).json()
        ctx["items"].append(it["id"])
        assert not any(i["id"] == it["id"] for i in requests.get(f"{BASE_URL}/items").json())
        arch = requests.get(f"{BASE_URL}/admin/items?status=archived", headers=ah).json()
        assert any(i["id"] == it["id"] for i in arch)
        for t in requests.get(f"{BASE_URL}/config").json()["themes"][:3]:
            assert not any(i["id"] == it["id"] for i in requests.get(f"{BASE_URL}/vivi/{t['slug']}").json()["items"])
        assert requests.get(f"{BASE_URL}/items/{it['id']}").status_code == 404

    def test_event_window_default_end(self, ctx):
        ah = H(ctx["admin"])
        today = date.today().isoformat()
        e1 = requests.post(f"{BASE_URL}/admin/items", headers=ah, json={"kind": "event", "title": f"TEST_Late_{RUN}", "start_date": today, "start_time": "21:00"}).json()
        e2 = requests.post(f"{BASE_URL}/admin/items", headers=ah, json={"kind": "event", "title": f"TEST_Early_{RUN}", "start_date": today, "start_time": "10:00"}).json()
        ctx["items"] += [e1["id"], e2["id"]]
        assert "T04:00" in e1["end_iso"] and e1["end_iso"][:10] > today
        assert "T23:59" in e2["end_iso"] and e2["end_iso"][:10] == today

    def test_surprise(self):
        d = requests.get(f"{BASE_URL}/surprise").json()
        assert isinstance(d, list) and 1 <= len(d) <= 3 and len({x["id"] for x in d}) == len(d)

    def test_ai_removed(self, ctx):
        assert requests.post(f"{BASE_URL}/ai/assistant", headers=H(ctx["a"]), json={"message": "hi"}).status_code in (404, 405)
        assert requests.post(f"{BASE_URL}/admin/ai/moderate/item/abc", headers=H(ctx["admin"])).status_code in (404, 405)
        assert requests.get(f"{BASE_URL}/admin/replies", headers=H(ctx["admin"])).status_code in (404, 405)


# v3.1: cross-user visibility (live + spotlight), promos, board-top/views, spotted message-only
class TestV31:
    def test_live_cross_user_zone_and_tz(self, ctx):
        v = ctx["venue"]
        zone = v.get("zone") or v.get("town")
        r_item = requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "fila", "item_id": v["id"], "note": "TEST31"}).json()
        r_zone = requests.post(f"{BASE_URL}/live/reports", headers=H(ctx["a"]), json={"tag": "pieno", "zone": zone, "note": "TEST31z"}).json()
        assert r_item["zone"] == zone and "+00:00" in r_item["created_at"]
        guest = requests.get(f"{BASE_URL}/live/reports", params={"item_id": v["id"], "zone": zone}).json()["reports"]
        ids = {x["id"] for x in guest}
        assert r_item["id"] in ids and r_zone["id"] in ids
        assert all("+00:00" in x["created_at"] or x["created_at"].endswith("Z") for x in guest)
        # without zone param only item reports
        only = {x["id"] for x in requests.get(f"{BASE_URL}/live/reports", params={"item_id": v["id"]}).json()["reports"]}
        assert r_item["id"] in only and r_zone["id"] not in only
        # global list (Explore/Info live) visible to guest & other user
        allg = {x["id"] for x in requests.get(f"{BASE_URL}/live/reports?limit=50").json()["reports"]}
        assert r_item["id"] in allg
        b = requests.get(f"{BASE_URL}/live/reports", headers=H(ctx["b"]), params={"item_id": v["id"], "zone": zone}).json()["reports"]
        mine = [x for x in b if x["id"] == r_item["id"]][0]
        assert mine["mine"] is False
        c = requests.post(f"{BASE_URL}/live/reports/{r_item['id']}/confirm", headers=H(ctx["b"])).json()
        assert c["confirms_count"] == 1 and c["confirmed"]

    def test_spotlight_guest_sees_other_user(self, ctx):
        vid = ctx["venue"]["id"]
        requests.post(f"{BASE_URL}/items/{vid}/vote", headers=H(ctx["a"]), json={"type": "here"})
        assert requests.post(f"{BASE_URL}/items/{vid}/spotlight", headers=H(ctx["a"]), json={"status": "TEST31 status"}).status_code == 200
        g = requests.get(f"{BASE_URL}/items/{vid}/spotlight", headers=H(dev=f"TEST-dev31-{RUN}"))
        assert g.status_code == 200
        p = [x for x in g.json()["people"] if x["username"] == ctx["a_name"]]
        assert p and p[0]["status"] == "TEST31 status" and not p[0]["me"]
        assert requests.post(f"{BASE_URL}/spotlight/{p[0]['id']}/wave", headers=H(dev=f"TEST-dev31-{RUN}"), json={}).status_code == 401

    def test_promos_seed_and_pending(self, ctx):
        pr = requests.get(f"{BASE_URL}/promos").json()
        assert len(pr) >= 3 and all(x.get("title") and x.get("business") for x in pr)
        body = {"title": f"TEST_Promo_{RUN}", "business": "TEST biz", "description": "x"}
        assert requests.post(f"{BASE_URL}/promos", json=body).status_code == 401
        r = requests.post(f"{BASE_URL}/promos", headers=H(ctx["a"]), json=body)
        assert r.status_code == 200 and r.json()["status"] == "pending"
        assert not any(x["title"] == body["title"] for x in requests.get(f"{BASE_URL}/promos").json())
        adm = requests.get(f"{BASE_URL}/admin/simple/promo", headers=H(ctx["admin"])).json()
        mine = [x for x in adm if x["title"] == body["title"]][0]
        u = requests.put(f"{BASE_URL}/admin/simple/promo/{mine['id']}", headers=H(ctx["admin"]), json={**body, "hidden": False})
        assert u.status_code == 200, u.text
        assert any(x["title"] == body["title"] for x in requests.get(f"{BASE_URL}/promos").json())
        requests.delete(f"{BASE_URL}/admin/simple/promo/{mine['id']}", headers=H(ctx["admin"]))
        assert not any(x["title"] == body["title"] for x in requests.get(f"{BASE_URL}/promos").json())

    def test_spotted_views_board_top(self, ctx):
        msg = f"TEST_spotted msg {RUN}"
        r = requests.post(f"{BASE_URL}/board/spotted/posts", headers=H(ctx["a"]), json={"data": {"message": msg}})
        assert r.status_code == 200, r.text
        MDB.posts.update_one({"data.message": msg}, {"$set": {"status": "approved"}})  # spotted requires approval
        posts = requests.get(f"{BASE_URL}/board/spotted?q={RUN}").json()["posts"]
        p = [x for x in posts if x.get("data", {}).get("message") == msg][0]
        assert set(p["data"].keys()) <= {"message"}
        assert p["title"].startswith("TEST_spotted")
        pid = p["id"]
        dev = f"TEST-devv-{RUN}"
        for _ in range(2):
            assert requests.post(f"{BASE_URL}/posts/{pid}/view", headers=H(dev=dev)).status_code == 200
        requests.post(f"{BASE_URL}/posts/{pid}/view", headers=H(ctx["b"]))
        assert MDB.posts.find_one({"title": p["title"]})["views"] == 2
        assert requests.post(f"{BASE_URL}/posts/{pid}/view").status_code in (400, 401, 422)
        top = requests.get(f"{BASE_URL}/board-top").json()
        assert 1 <= len(top) <= 5 and all("views" in x and "section_name" in x for x in top)
        vs = [x["views"] for x in top]
        assert vs == sorted(vs, reverse=True)
        MDB.posts.delete_many({"title": p["title"]})
        MDB.post_views.delete_many({"post_id": pid})
