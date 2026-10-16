"""Regression tests for Cosa Fare a Potenza API (public, voting, submissions, spotted, auth, admin)."""
import os
import uuid
import time
import pytest
import requests

def _base():
    u = os.environ.get("REACT_APP_BACKEND_URL")
    if not u:
        for line in open("/app/frontend/.env"):
            if line.startswith("REACT_APP_BACKEND_URL="):
                u = line.split("=", 1)[1].strip()
    return u.rstrip("/")

BASE_URL = _base()
API = f"{BASE_URL}/api"
ADMIN_USER, ADMIN_EMAIL, ADMIN_PW, ADMIN_PIN = "admin", "admin@cosafarepotenza.it", "admin123", "admin123"


def dev_headers():
    return {"X-Device-Id": f"test-{uuid.uuid4().hex[:12]}"}


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def created(admin_h):
    ids = {"items": [], "spotted": []}
    yield ids
    admin_h = {"Authorization": "Bearer " + requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN}).json().get("token", "")}
    for i in ids["items"]:
        requests.delete(f"{API}/admin/items/{i}", headers=admin_h)
    for s in ids["spotted"]:
        requests.delete(f"{API}/admin/spotted/{s}", headers=admin_h)


@pytest.fixture(scope="module")
def test_item(admin_h, created):
    # Admin-created venue (approved immediately) used for vote/save tests
    r = requests.post(f"{API}/admin/items", headers=admin_h,
                      json={"kind": "venue", "title": f"TEST_Venue {uuid.uuid4().hex[:6]}", "zone": "Centro"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "approved"
    created["items"].append(d["id"])
    return d


# ---------- public ----------
class TestPublic:
    def test_home(self):
        r = requests.get(f"{API}/home")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["featured"], list) and isinstance(d["trending"], list)
        assert all(x["featured"] for x in d["featured"])
        assert len(d["trending"]) <= 10
        assert "_score" not in (d["trending"][0] if d["trending"] else {})

    def test_items_filters(self):
        all_ = requests.get(f"{API}/items", params={"when": "all"}).json()
        assert all(x["status"] == "approved" for x in all_)
        ev = requests.get(f"{API}/items", params={"kind": "event", "when": "all"}).json()
        assert ev and all(x["kind"] == "event" for x in ev)
        q = requests.get(f"{API}/items", params={"q": "padel", "when": "all"}).json()
        assert q and all("padel" in (x["title"] + x["description"]).lower() for x in q)
        tonight = requests.get(f"{API}/items", params={"when": "tonight"}).json()
        titles = [x["title"] for x in tonight]
        assert "Sagra della Castagna e Prodotti Tipici" not in titles  # tomorrow event
        wk = requests.get(f"{API}/items", params={"when": "weekend"}).json()
        assert any(x["title"].startswith("Sagra") for x in wk)

    def test_pending_not_public(self):
        all_ = requests.get(f"{API}/items", params={"when": "all"}).json()
        titles = [x["title"] for x in all_]
        assert "Aperitivo Vinile in Terrazza" not in titles
        assert "Arcade Room Gallitello" not in titles

    def test_item_404(self):
        assert requests.get(f"{API}/items/000000000000000000000000").status_code == 404
        assert requests.get(f"{API}/items/badid").status_code == 404


# ---------- voting & save ----------
class TestVoting:
    def test_vote_switch_and_cancel(self, test_item):
        iid, h = test_item["id"], dev_headers()
        r = requests.post(f"{API}/items/{iid}/vote", json={"type": "going"}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["my_vote"] == "going" and d["level"] == 1 and d["display_count"] is None
        r = requests.post(f"{API}/items/{iid}/vote", json={"type": "here"}, headers=h).json()
        assert r["my_vote"] == "here" and r["level"] == 1
        adm = requests.get(f"{API}/items/{iid}", headers=h).json()
        assert adm["my_vote"] == "here"
        r = requests.post(f"{API}/items/{iid}/vote", json={"type": "here"}, headers=h).json()
        assert r["my_vote"] is None and r["level"] == 0

    def test_vote_score_not_doubled(self, test_item, admin_h):
        iid, h = test_item["id"], dev_headers()
        requests.post(f"{API}/items/{iid}/vote", json={"type": "going"}, headers=h)
        requests.post(f"{API}/items/{iid}/vote", json={"type": "here"}, headers=h)
        items = requests.get(f"{API}/admin/items", headers=admin_h).json()
        it = next(x for x in items if x["id"] == iid)
        assert it["score"] == 1 and it["here"] == 1 and it["going"] == 0
        requests.post(f"{API}/items/{iid}/vote", json={"type": "here"}, headers=h)

    def test_vote_requires_device(self, test_item):
        r = requests.post(f"{API}/items/{test_item['id']}/vote", json={"type": "going"})
        assert r.status_code == 400

    def test_vote_invalid_type(self, test_item):
        r = requests.post(f"{API}/items/{test_item['id']}/vote", json={"type": "x"}, headers=dev_headers())
        assert r.status_code == 422

    def test_save_toggle(self, test_item):
        iid, h = test_item["id"], dev_headers()
        r = requests.post(f"{API}/items/{iid}/save", headers=h).json()
        assert r["saved"] is True
        saved = requests.get(f"{API}/me/saved", headers=h).json()
        assert any(x["id"] == iid for x in saved)
        r = requests.post(f"{API}/items/{iid}/save", headers=h).json()
        assert r["saved"] is False
        assert not any(x["id"] == iid for x in requests.get(f"{API}/me/saved", headers=h).json())


# ---------- submissions ----------
class TestSubmissions:
    def test_event_requires_date(self):
        r = requests.post(f"{API}/submissions/item", json={"kind": "event", "title": "TEST_NoDate"}, headers=dev_headers())
        assert r.status_code == 422

    def test_invalid_kind(self):
        r = requests.post(f"{API}/submissions/item", json={"kind": "bad", "title": "TEST_bad"}, headers=dev_headers())
        assert r.status_code == 422

    def test_submit_item_pending_then_approve(self, admin_h, created):
        title = f"TEST_Event {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/submissions/item", headers=dev_headers(),
                          json={"kind": "event", "title": title, "start_date": "2099-01-01", "start_time": "21:00"})
        assert r.status_code == 200 and r.json()["ok"]
        assert not any(x["title"] == title for x in requests.get(f"{API}/items", params={"when": "all"}).json())
        pend = requests.get(f"{API}/admin/pending", headers=admin_h).json()
        it = next(x for x in pend["items"] if x["title"] == title)
        created["items"].append(it["id"])
        # edit then approve
        ed = requests.put(f"{API}/admin/items/{it['id']}", headers=admin_h,
                          json={"kind": "event", "title": title + " ED", "start_date": "2099-01-01"})
        assert ed.status_code == 200 and ed.json()["title"] == title + " ED"
        ap = requests.post(f"{API}/admin/items/{it['id']}/status", headers=admin_h, json={"status": "approved"})
        assert ap.json()["status"] == "approved"
        assert any(x["id"] == it["id"] for x in requests.get(f"{API}/items", params={"when": "all"}).json())
        rj = requests.post(f"{API}/admin/items/{it['id']}/status", headers=admin_h, json={"status": "rejected"})
        assert rj.json()["status"] == "rejected"
        assert requests.get(f"{API}/items/{it['id']}").status_code == 404

    def test_submit_spotted_guest_code(self, admin_h, created):
        r = requests.post(f"{API}/submissions/spotted", headers=dev_headers(),
                          json={"where": "TEST_Bus 1", "message": "TEST message ciao", "tag": "trasporti"})
        assert r.status_code == 200
        code = r.json()["code"]
        assert code and code.startswith("SPOT-") and len(code) == 11
        pub = requests.get(f"{API}/spotted").json()
        assert not any(s["where"] == "TEST_Bus 1" for s in pub)
        sp = next(s for s in requests.get(f"{API}/admin/pending", headers=admin_h).json()["spotted"] if s["where"] == "TEST_Bus 1")
        created["spotted"].append(sp["id"])
        assert "owner_code" not in sp
        assert requests.post(f"{API}/admin/spotted/{sp['id']}/status", headers=admin_h, json={"status": "approved"}).status_code == 200
        pub = requests.get(f"{API}/spotted").json()
        s = next(s for s in pub if s["id"] == sp["id"])
        assert "owner_code" not in s and "owner_user" not in s
        # reactions toggle
        h = dev_headers()
        d = requests.post(f"{API}/spotted/{sp['id']}/react", json={"type": "heart"}, headers=h).json()
        assert d["reactions"]["heart"] == 1 and "heart" in d["my_reactions"]
        d = requests.post(f"{API}/spotted/{sp['id']}/react", json={"type": "heart"}, headers=h).json()
        assert d["reactions"]["heart"] == 0 and d["my_reactions"] == []
        # reply & code
        rr = requests.post(f"{API}/spotted/{sp['id']}/reply", json={"message": "Sono io!", "contact": "@test_ig"}, headers=h)
        assert rr.status_code == 200
        c = requests.post(f"{API}/spotted-code", json={"code": code.lower()}).json()
        assert c["spotted"]["id"] == sp["id"] and c["replies"][0]["contact"] == "@test_ig"
        assert requests.post(f"{API}/spotted-code", json={"code": "SPOT-000000"}).status_code == 404
        reps = requests.get(f"{API}/admin/replies", headers=admin_h).json()
        assert any(x["spotted_id"] == sp["id"] and x["spotted_where"] == "TEST_Bus 1" for x in reps)

    def test_spotted_tag_filter(self):
        d = requests.get(f"{API}/spotted", params={"tag": "unibas"}).json()
        assert all(s["tag"] == "unibas" for s in d)


# ---------- auth ----------
class TestAuth:
    def test_register_login_me(self, created):
        u = f"test_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/auth/register", json={"username": u, "email": f"{u}@ex.com", "password": "secret1"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "user"
        dup = requests.post(f"{API}/auth/register", json={"username": u.upper(), "email": f"x{u}@ex.com", "password": "secret1"})
        assert dup.status_code == 409
        for ident in (u, f"{u}@ex.com", u.upper()):
            lr = requests.post(f"{API}/auth/login", json={"identifier": ident, "password": "secret1"})
            assert lr.status_code == 200, ident
        tok = lr.json()["token"]
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert me.json()["username"] == u
        # user spotted -> no code, visible in /me/spotted & submissions
        h = {"Authorization": f"Bearer {tok}"}
        sr = requests.post(f"{API}/submissions/spotted", headers=h, json={"where": "TEST_UserSpot", "message": "hello world"}).json()
        assert sr["code"] is None
        ms = requests.get(f"{API}/me/spotted", headers=h).json()
        assert ms[0]["where"] == "TEST_UserSpot"
        created["spotted"].append(ms[0]["id"])
        subs = requests.get(f"{API}/me/submissions", headers=h).json()
        assert subs[0]["status"] == "pending"
        # non-admin token rejected on admin endpoints
        assert requests.get(f"{API}/admin/pending", headers=h).status_code == 401

    def test_admin_login_username_and_email(self):
        for ident in (ADMIN_USER, ADMIN_EMAIL):
            r = requests.post(f"{API}/auth/login", json={"identifier": ident, "password": ADMIN_PW})
            assert r.status_code == 200 and r.json()["user"]["role"] == "admin"
        tok = r.json()["token"]
        assert requests.get(f"{API}/admin/check", headers={"Authorization": f"Bearer {tok}"}).status_code == 200

    def test_validation(self):
        assert requests.post(f"{API}/auth/register", json={"username": "ab", "email": "a@b.co", "password": "secret1"}).status_code == 422
        assert requests.post(f"{API}/auth/register", json={"username": "abcd_x", "email": "bad", "password": "secret1"}).status_code == 422
        assert requests.post(f"{API}/auth/register", json={"username": "abcd_x", "email": "a@b.co", "password": "123"}).status_code == 422

    def test_brute_force(self):
        ident = f"nouser_{uuid.uuid4().hex[:6]}"
        codes = [requests.post(f"{API}/auth/login", json={"identifier": ident, "password": "x"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes

    def test_no_auth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401
        assert requests.get(f"{API}/admin/pending").status_code == 401


# ---------- admin ----------
class TestAdmin:
    def test_feature_boost_threshold(self, admin_h, test_item):
        iid = test_item["id"]
        f = requests.post(f"{API}/admin/items/{iid}/feature", headers=admin_h).json()
        assert f["featured"] is True
        assert any(x["id"] == iid for x in requests.get(f"{API}/home").json()["featured"])
        f = requests.post(f"{API}/admin/items/{iid}/feature", headers=admin_h).json()
        assert f["featured"] is False
        b = requests.post(f"{API}/admin/items/{iid}/boost", headers=admin_h, json={"amount": 25}).json()
        assert b["boost"] == 25 and b["level"] == 3 and b["display_count"] == 25
        b = requests.post(f"{API}/admin/items/{iid}/boost", headers=admin_h, json={"amount": 25}).json()
        assert b["boost"] == 50 and b["level"] == 4
        b = requests.post(f"{API}/admin/items/{iid}/boost", headers=admin_h, json={"amount": 0}).json()
        assert b["boost"] == 0 and b["level"] == 0
        requests.post(f"{API}/admin/items/{iid}/boost", headers=admin_h, json={"amount": 10})
        assert requests.get(f"{API}/items/{iid}").json()["display_count"] is None
        s = requests.put(f"{API}/admin/settings", headers=admin_h, json={"threshold": 5})
        try:
            assert s.json()["threshold"] == 5
            assert requests.get(f"{API}/items/{iid}").json()["display_count"] == 10
        finally:
            requests.put(f"{API}/admin/settings", headers=admin_h, json={"threshold": 20})
        assert requests.get(f"{API}/admin/settings", headers=admin_h).json()["threshold"] == 20
        assert requests.put(f"{API}/admin/settings", headers=admin_h, json={"threshold": 0}).status_code == 422
        requests.post(f"{API}/admin/items/{iid}/boost", headers=admin_h, json={"amount": 0})

    def test_delete_item(self, admin_h):
        r = requests.post(f"{API}/admin/items", headers=admin_h, json={"kind": "place", "title": "TEST_ToDelete"}).json()
        assert requests.delete(f"{API}/admin/items/{r['id']}", headers=admin_h).status_code == 200
        assert requests.get(f"{API}/items/{r['id']}").status_code == 404

    def test_pin_change_invalidates(self, admin_h):
        old = requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN}).json()["token"]
        oh = {"Authorization": f"Bearer {old}"}
        r = requests.put(f"{API}/admin/settings", headers=oh, json={"new_pin": "tmp9999"})
        assert r.json()["pin_changed"] is True
        try:
            assert requests.get(f"{API}/admin/check", headers=oh).status_code == 401
            assert requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN}).status_code == 401
            new = requests.post(f"{API}/admin/pin", json={"pin": "tmp9999"}).json()["token"]
            nh = {"Authorization": f"Bearer {new}"}
            assert requests.get(f"{API}/admin/check", headers=nh).status_code == 200
        finally:
            requests.put(f"{API}/admin/settings", headers=nh, json={"new_pin": ADMIN_PIN})
        assert requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN}).status_code == 200
