# Cosa Fare a Potenza 2.0 - backend regression tests (config, bacheca, lifecycle, reports, poll, struct, config, banners, users, backup)
import os
import json
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"
RUN = uuid.uuid4().hex[:6]
ADMIN = {"identifier": "admin", "password": "admin123"}


def H(tok=None, dev=None):
    h = {"Content-Type": "application/json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    if dev:
        h["X-Device-Id"] = dev
    return h


def register(name):
    r = requests.post(f"{BASE_URL}/auth/register", json={"username": f"TEST_{name}_{RUN}", "email": f"test_{name}_{RUN}@ex.com", "password": "secret123"})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def ctx():
    r = requests.post(f"{BASE_URL}/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    c = {"admin": r.json()["token"]}
    a = register("alice"); b = register("bob"); m = register("mod")
    c.update(alice=a["token"], alice_id=a["user"]["id"], bob=b["token"], bob_id=b["user"]["id"], mod=m["token"], mod_id=m["user"]["id"])
    yield c
    # cleanup test users (posts of test users), restore config
    at = c["admin"]
    for uid in (c["alice_id"], c["bob_id"], c["mod_id"]):
        requests.delete(f"{BASE_URL}/admin/users/{uid}", headers=H(at))
    for p in requests.get(f"{BASE_URL}/admin/posts?status=", headers=H(at)).json():
        if "TEST_" in json.dumps(p.get("data", {})) or "TEST_" in p.get("title", ""):
            requests.delete(f"{BASE_URL}/admin/posts/{p['id']}", headers=H(at))
    cfg = requests.get(f"{BASE_URL}/admin/config", headers=H(at)).json()
    cfg["home"]["title"], cfg["home"]["subtitle"] = "Cosa fare a", "Potenza"
    cfg["trend"]["threshold"] = 20
    requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"home": cfg["home"], "trend": cfg["trend"]})


# ---- Backup / restore (run first, before test data) ----
class TestBackup:
    def test_backup_and_restore(self, ctx):
        r = requests.get(f"{BASE_URL}/admin/backup", headers=H(ctx["admin"]))
        assert r.status_code == 200
        assert "password_hash" not in r.text
        data = r.json()["data"]
        assert "users" in data and "sections" in data
        r2 = requests.post(f"{BASE_URL}/admin/restore", headers={"Authorization": f"Bearer {ctx['admin']}"},
                           files={"file": ("b.json", r.content, "application/json")})
        assert r2.status_code == 200, r2.text
        assert requests.post(f"{BASE_URL}/auth/login", json=ADMIN).status_code == 200
        # test users existed in backup -> password preserved
        assert requests.post(f"{BASE_URL}/auth/login", json={"identifier": f"TEST_alice_{RUN}", "password": "secret123"}).status_code == 200


# ---- Config & permissions ----
class TestConfigPerms:
    def test_public_config(self):
        d = requests.get(f"{BASE_URL}/config").json()
        for k in ("categories", "sections", "home", "texts", "trend"):
            assert k in d
        assert all("count" in s for s in d["sections"])
        assert {"spotted", "passaggi"} <= {s["slug"] for s in d["sections"]}

    def test_super_only_403_for_admin_401_for_user(self, ctx):
        r = requests.post(f"{BASE_URL}/admin/users/{ctx['mod_id']}", headers=H(ctx["admin"]), json={"role": "admin"})
        assert r.status_code == 200
        assert requests.get(f"{BASE_URL}/admin/pending", headers=H(ctx["mod"])).status_code == 200
        for path in ("admin/config", "admin/users", "admin/banners", "admin/audit", "admin/backup"):
            assert requests.get(f"{BASE_URL}/{path}", headers=H(ctx["mod"])).status_code == 403, path
            assert requests.get(f"{BASE_URL}/{path}", headers=H(ctx["alice"])).status_code == 401, path
        assert requests.post(f"{BASE_URL}/admin/struct/sections", headers=H(ctx["mod"]), json={"name": "x"}).status_code == 403

    def test_audit_has_entries(self, ctx):
        au = requests.get(f"{BASE_URL}/admin/audit", headers=H(ctx["admin"])).json()
        assert any(f"TEST_mod_{RUN}" in x["target"] for x in au)


# ---- Bacheca ----
class TestBoard:
    def test_guest_cannot_post(self):
        r = requests.post(f"{BASE_URL}/board/passaggi/posts", json={"data": {"from": "A", "to": "B", "date": "2026-12-01"}})
        assert r.status_code == 401

    def test_required_field_422(self, ctx):
        r = requests.post(f"{BASE_URL}/board/passaggi/posts", headers=H(ctx["alice"]), json={"data": {"from": "Potenza"}})
        assert r.status_code == 422

    def test_passaggio_immediate_and_spotted_pending(self, ctx):
        r = requests.post(f"{BASE_URL}/board/passaggi/posts", headers=H(ctx["alice"]),
                          json={"data": {"from": "TEST_Potenza", "to": "Matera", "date": "2026-12-20"}, "tag": "Offro passaggio"})
        assert r.status_code == 200 and r.json()["status"] == "approved"
        b = requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()
        assert len(b["posts"]) == 1 and b["posts"][0]["title"] == "TEST_Potenza → Matera"
        assert "owner_user" not in b["posts"][0]
        assert len(requests.get(f"{BASE_URL}/board/passaggi?tag=Offro%20passaggio&q=TEST_Potenza").json()["posts"]) == 1
        assert len(requests.get(f"{BASE_URL}/board/passaggi?tag=Cerco%20passaggio&q=TEST_Potenza").json()["posts"]) == 0
        r = requests.post(f"{BASE_URL}/board/spotted/posts", headers=H(ctx["alice"]), json={"data": {"where": "TEST_Unibas", "message": "ciao bella"}})
        assert r.json()["status"] == "pending"
        assert len(requests.get(f"{BASE_URL}/board/spotted?q=TEST_Unibas").json()["posts"]) == 0

    def test_reactions_toggle(self, ctx):
        pid = requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"][0]["id"]
        dev = "dev-" + RUN
        r1 = requests.post(f"{BASE_URL}/posts/{pid}/react", headers=H(dev=dev), json={"type": "fire"}).json()
        assert r1["reactions"]["fire"] == 1 and r1["my_reactions"] == ["fire"]
        r2 = requests.post(f"{BASE_URL}/posts/{pid}/react", headers=H(dev=dev), json={"type": "fire"}).json()
        assert r2["reactions"]["fire"] == 0 and r2["my_reactions"] == []

    def test_reply_inbox_unread(self, ctx):
        pid = requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"][0]["id"]
        assert requests.post(f"{BASE_URL}/posts/{pid}/reply", json={"message": "ci sto", "contact": "@bob"}).status_code == 401
        r = requests.post(f"{BASE_URL}/posts/{pid}/reply", headers=H(ctx["bob"]), json={"message": "TEST_ ci sto", "contact": "@bob"})
        assert r.status_code == 200
        assert requests.get(f"{BASE_URL}/me/unread", headers=H(ctx["alice"])).json()["count"] == 1
        inbox = requests.get(f"{BASE_URL}/me/inbox", headers=H(ctx["alice"])).json()
        assert inbox[0]["message"] == "TEST_ ci sto" and inbox[0]["from_name"] == f"TEST_bob_{RUN}"
        assert requests.get(f"{BASE_URL}/me/inbox", headers=H(ctx["bob"])).json() == []
        assert requests.get(f"{BASE_URL}/admin/replies", headers=H(ctx["admin"])).status_code in (404, 405)  # v3: admin replies removed
        requests.post(f"{BASE_URL}/me/inbox/read", headers=H(ctx["alice"]))
        assert requests.get(f"{BASE_URL}/me/unread", headers=H(ctx["alice"])).json()["count"] == 0


# ---- Owner lifecycle ----
class TestLifecycle:
    def test_listings_reject_edit_complete_delete(self, ctx):
        L = requests.get(f"{BASE_URL}/me/listings", headers=H(ctx["alice"])).json()
        sp = next(x for x in L if x["kind"] == "spotted")
        pa = next(x for x in L if x["kind"] == "passaggi")
        assert sp["status"] == "pending" and pa["status"] == "approved"
        # admin rejects with reason
        requests.post(f"{BASE_URL}/admin/posts/{sp['id']}/status", headers=H(ctx["admin"]), json={"status": "rejected", "reason": "TEST motivo"})
        sp = next(x for x in requests.get(f"{BASE_URL}/me/listings", headers=H(ctx["alice"])).json() if x["id"] == sp["id"])
        assert sp["status"] == "rejected" and sp["reject_reason"] == "TEST motivo"
        # approve then edit -> back to pending
        requests.post(f"{BASE_URL}/admin/posts/{sp['id']}/status", headers=H(ctx["admin"]), json={"status": "approved"})
        assert len(requests.get(f"{BASE_URL}/board/spotted?q=TEST_Unibas").json()["posts"]) == 1
        r = requests.put(f"{BASE_URL}/me/posts/{sp['id']}", headers=H(ctx["alice"]), json={"data": {"where": "TEST_Unibas2", "message": "edit msg"}})
        assert r.json()["status"] == "pending"
        assert len(requests.get(f"{BASE_URL}/board/spotted?q=TEST_Unibas").json()["posts"]) == 0
        # passaggi edit stays approved
        r = requests.put(f"{BASE_URL}/me/posts/{pa['id']}", headers=H(ctx["alice"]), json={"data": {"from": "TEST_Potenza", "to": "Bari", "date": "2026-12-21"}})
        assert r.json()["status"] == "approved"
        # complete hides
        requests.post(f"{BASE_URL}/me/posts/{pa['id']}/complete", headers=H(ctx["alice"]))
        assert len(requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"]) == 0
        requests.post(f"{BASE_URL}/me/posts/{pa['id']}/complete", headers=H(ctx["alice"]))
        assert len(requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"]) == 1
        # bob cannot touch alice post
        assert requests.delete(f"{BASE_URL}/me/posts/{pa['id']}", headers=H(ctx["bob"])).status_code == 404
        assert requests.delete(f"{BASE_URL}/me/posts/{sp['id']}", headers=H(ctx["alice"])).status_code == 200
        assert not any(x["id"] == sp["id"] for x in requests.get(f"{BASE_URL}/me/listings", headers=H(ctx["alice"])).json())

    def test_passaggi_past_date_expired(self, ctx):
        requests.post(f"{BASE_URL}/board/passaggi/posts", headers=H(ctx["alice"]), json={"data": {"from": "TEST_Old", "to": "X", "date": "2026-10-01"}})
        assert len(requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Old").json()["posts"]) == 0
        x = next(x for x in requests.get(f"{BASE_URL}/me/listings", headers=H(ctx["alice"])).json() if x["title"].startswith("TEST_Old"))
        assert x["expired"] is True


# ---- Reports & block ----
class TestReports:
    def test_report_and_block(self, ctx):
        requests.post(f"{BASE_URL}/board/unisciti/posts", headers=H(ctx["bob"]), json={"data": {"activity": "TEST_calcetto"}})
        pid = requests.get(f"{BASE_URL}/board/unisciti?q=TEST_calcetto").json()["posts"][0]["id"]
        # v3: guests may report (device id required)
        assert requests.post(f"{BASE_URL}/reports", json={"target_type": "post", "target_id": pid}).status_code == 400
        assert requests.post(f"{BASE_URL}/reports", headers=H(ctx["alice"]), json={"target_type": "post", "target_id": pid, "reason": "TEST spam"}).status_code == 200
        reps = requests.get(f"{BASE_URL}/admin/reports", headers=H(ctx["admin"])).json()
        rep = next(r for r in reps if r["target_id"] == pid)
        assert requests.post(f"{BASE_URL}/admin/reports/{rep['id']}/action", headers=H(ctx["admin"]), json={"action": "block"}).status_code == 200
        assert len(requests.get(f"{BASE_URL}/board/unisciti?q=TEST_calcetto").json()["posts"]) == 0
        assert requests.post(f"{BASE_URL}/board/unisciti/posts", headers=H(ctx["bob"]), json={"data": {"activity": "TEST_x"}}).status_code == 403
        apid = requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"][0]["id"]
        assert requests.post(f"{BASE_URL}/posts/{apid}/reply", headers=H(ctx["bob"]), json={"message": "hey", "contact": "xx"}).status_code == 403
        requests.post(f"{BASE_URL}/admin/users/{ctx['bob_id']}", headers=H(ctx["admin"]), json={"blocked": False})
        assert requests.post(f"{BASE_URL}/posts/{apid}/reply", headers=H(ctx["bob"]), json={"message": "hey", "contact": "xx"}).status_code == 200

    def test_report_ignore(self, ctx):
        apid = requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"][0]["id"]
        requests.post(f"{BASE_URL}/reports", headers=H(ctx["bob"]), json={"target_type": "post", "target_id": apid})
        rep = next(r for r in requests.get(f"{BASE_URL}/admin/reports", headers=H(ctx["admin"])).json() if r["target_id"] == apid)
        requests.post(f"{BASE_URL}/admin/reports/{rep['id']}/action", headers=H(ctx["admin"]), json={"action": "ignore"})
        assert len(requests.get(f"{BASE_URL}/board/passaggi?q=TEST_Potenza").json()["posts"]) == 1


# ---- Poll ----
class TestPoll:
    def test_poll_vote_once(self, ctx):
        assert requests.post(f"{BASE_URL}/admin/polls", headers=H(ctx["admin"]), json={"question": f"TEST_poll {RUN}?", "options": ["A", "B"]}).status_code == 200
        dev = "pdev-" + RUN
        p = requests.get(f"{BASE_URL}/poll", headers=H(dev=dev)).json()
        try:
            assert p["question"] == f"TEST_poll {RUN}?"
            assert "pct" not in p["options"][0] and p["total"] is None
            v = requests.post(f"{BASE_URL}/poll/{p['id']}/vote", headers=H(dev=dev), json={"option": 1})
            assert v.status_code == 200 and v.json()["options"][1]["pct"] == 100
            assert requests.post(f"{BASE_URL}/poll/{p['id']}/vote", headers=H(dev=dev), json={"option": 0}).status_code == 409
            p2 = requests.get(f"{BASE_URL}/poll", headers=H(dev=dev)).json()
            assert p2["my_vote"] == 1 and "pct" in p2["options"][0]
            requests.post(f"{BASE_URL}/admin/polls/{p['id']}/close", headers=H(ctx["admin"]))
            assert (requests.get(f"{BASE_URL}/poll").json() or {}).get("id") != p["id"]
        finally:
            requests.delete(f"{BASE_URL}/admin/polls/{p['id']}", headers=H(ctx["admin"]))


# ---- Structure (categories / sections) ----
class TestStruct:
    def test_category_lifecycle(self, ctx):
        at = ctx["admin"]
        c = requests.post(f"{BASE_URL}/admin/struct/categories", headers=H(at), json={"name": "TEST Sagre in Provincia", "dated": True}).json()
        try:
            assert any(x["slug"] == c["slug"] for x in requests.get(f"{BASE_URL}/config").json()["categories"])
            r = requests.post(f"{BASE_URL}/submissions/item", headers=H(ctx["alice"]), json={"kind": c["slug"], "title": "TEST_Sagra", "start_date": "2026-11-01"})
            assert r.status_code == 200, r.text
            assert requests.post(f"{BASE_URL}/submissions/item", headers=H(ctx["alice"]), json={"kind": c["slug"], "title": "TEST_Sagra2"}).status_code == 422
            assert requests.delete(f"{BASE_URL}/admin/struct/categories/{c['id']}", headers=H(at)).status_code == 409
            requests.put(f"{BASE_URL}/admin/struct/categories/{c['id']}", headers=H(at), json={"hidden": True})
            assert not any(x["slug"] == c["slug"] for x in requests.get(f"{BASE_URL}/config").json()["categories"])
        finally:
            for it in requests.get(f"{BASE_URL}/admin/items?status=pending", headers=H(at)).json():
                if it["title"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/admin/items/{it['id']}", headers=H(at))
            requests.delete(f"{BASE_URL}/admin/struct/categories/{c['id']}", headers=H(at))

    def test_section_lifecycle(self, ctx):
        at = ctx["admin"]
        s = requests.post(f"{BASE_URL}/admin/struct/sections", headers=H(at), json={"name": "TEST Feste Universitarie", "requires_approval": False,
                          "fields": [{"key": "party", "label": "Festa", "type": "text", "required": True, "options": []},
                                     {"key": "when", "label": "Quando", "type": "date", "required": False, "options": []}], "tags": ["Lauree"], "reply_label": "Vengo!"}).json()
        try:
            slug = s["slug"]
            assert any(x["slug"] == slug for x in requests.get(f"{BASE_URL}/config").json()["sections"])
            assert requests.post(f"{BASE_URL}/board/{slug}/posts", headers=H(ctx["alice"]), json={"data": {}}).status_code == 422
            r = requests.post(f"{BASE_URL}/board/{slug}/posts", headers=H(ctx["alice"]), json={"data": {"party": "TEST_laurea"}, "tag": "Lauree"})
            assert r.json()["status"] == "approved"
            posts = requests.get(f"{BASE_URL}/board/{slug}?tag=Lauree").json()["posts"]
            assert posts[0]["title"] == "TEST_laurea"
            # reorder
            ids = [x["id"] for x in requests.get(f"{BASE_URL}/admin/struct/sections", headers=H(at)).json()]
            new = [s["id"]] + [i for i in ids if i != s["id"]]
            requests.post(f"{BASE_URL}/admin/struct/sections/reorder", headers=H(at), json={"ids": new})
            assert requests.get(f"{BASE_URL}/config").json()["sections"][0]["slug"] == slug
            requests.post(f"{BASE_URL}/admin/struct/sections/reorder", headers=H(at), json={"ids": ids})
            # hide
            requests.put(f"{BASE_URL}/admin/struct/sections/{s['id']}", headers=H(at), json={"hidden": True})
            assert requests.get(f"{BASE_URL}/board/{slug}").status_code == 404
            assert requests.delete(f"{BASE_URL}/admin/struct/sections/{s['id']}", headers=H(at)).status_code == 409
        finally:
            for p in requests.get(f"{BASE_URL}/admin/posts?section={s['slug']}&status=", headers=H(at)).json():
                requests.delete(f"{BASE_URL}/admin/posts/{p['id']}", headers=H(at))
            assert requests.delete(f"{BASE_URL}/admin/struct/sections/{s['id']}", headers=H(at)).status_code == 200

    def test_section_fields_without_key(self, ctx):
        at = ctx["admin"]
        s = requests.post(f"{BASE_URL}/admin/struct/sections", headers=H(at), json={"name": "TEST NoKey", "requires_approval": False,
                          "fields": [{"label": "Nome Festa", "type": "text", "required": True}]}).json()
        try:
            r = requests.post(f"{BASE_URL}/board/{s['slug']}/posts", headers=H(ctx["alice"]), json={"data": {"nome_festa": "TEST_x"}})
            assert r.status_code in (200, 422), f"server error {r.status_code}"
        finally:
            for p in requests.get(f"{BASE_URL}/admin/posts?section={s['slug']}&status=", headers=H(at)).json():
                requests.delete(f"{BASE_URL}/admin/posts/{p['id']}", headers=H(at))
            requests.delete(f"{BASE_URL}/admin/struct/sections/{s['id']}", headers=H(at))


# ---- Config PUT ----
class TestConfigPut:
    def test_home_alert_threshold(self, ctx):
        at = ctx["admin"]
        cfg = requests.get(f"{BASE_URL}/admin/config", headers=H(at)).json()
        home = cfg["home"]; home["title"] = "TEST Titolo"; home["alert"] = {"active": True, "text": "TEST allerta", "start": "", "end": ""}
        sch = home.get("schedules", []); home["schedules"] = []  # day-independent
        requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"home": home})
        h = requests.get(f"{BASE_URL}/config").json()["home"]
        assert h["title"] == "TEST Titolo" and h["alert"]["text"] == "TEST allerta"
        home["alert"]["active"] = False; home["title"] = "Cosa fare a"; home["schedules"] = sch
        requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"home": home})
        assert requests.get(f"{BASE_URL}/config").json()["home"]["alert"] is None
        # threshold
        it = requests.post(f"{BASE_URL}/admin/items", headers=H(at), json={"kind": "venue", "title": "TEST_Locale"}).json()
        try:
            out = requests.post(f"{BASE_URL}/admin/items/{it['id']}/boost", headers=H(at), json={"amount": 25}).json()
            assert out["score"] == 25
            assert requests.get(f"{BASE_URL}/items/{it['id']}").json()["display_count"] == 25
            tr = cfg["trend"]; tr["threshold"] = 30
            requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"trend": tr})
            assert requests.get(f"{BASE_URL}/items/{it['id']}").json()["display_count"] is None
            tr["threshold"] = 0
            assert requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"trend": tr}).status_code == 422
        finally:
            tr["threshold"] = 20
            requests.put(f"{BASE_URL}/admin/config", headers=H(at), json={"trend": tr})
            requests.delete(f"{BASE_URL}/admin/items/{it['id']}", headers=H(at))


# ---- Banners ----
class TestBanners:
    def test_banner_views_clicks(self, ctx):
        at = ctx["admin"]
        requests.post(f"{BASE_URL}/admin/banners", headers=H(at), json={"title": f"TEST_banner_{RUN}", "position": "section:case", "priority": -5})
        b = next(x for x in requests.get(f"{BASE_URL}/admin/banners", headers=H(at)).json() if x["title"] == f"TEST_banner_{RUN}")
        try:
            pub = requests.get(f"{BASE_URL}/banners?position=section:case").json()
            assert any(x["id"] == b["id"] for x in pub)
            requests.post(f"{BASE_URL}/banners/{b['id']}/click")
            b2 = next(x for x in requests.get(f"{BASE_URL}/admin/banners", headers=H(at)).json() if x["id"] == b["id"])
            assert b2["views"] == 1 and b2["clicks"] == 1
            requests.put(f"{BASE_URL}/admin/banners/{b['id']}", headers=H(at), json={"active": False})
            assert not any(x["id"] == b["id"] for x in requests.get(f"{BASE_URL}/banners?position=section:case").json())
        finally:
            requests.delete(f"{BASE_URL}/admin/banners/{b['id']}", headers=H(at))


# ---- Users admin ----
class TestUsers:
    def test_reset_password_and_demote(self, ctx):
        at = ctx["admin"]
        requests.post(f"{BASE_URL}/admin/users/{ctx['alice_id']}", headers=H(at), json={"password": "newpass99"})
        assert requests.post(f"{BASE_URL}/auth/login", json={"identifier": f"TEST_alice_{RUN}", "password": "newpass99"}).status_code == 200
        requests.post(f"{BASE_URL}/admin/users/{ctx['mod_id']}", headers=H(at), json={"role": "user"})
        assert requests.get(f"{BASE_URL}/admin/pending", headers=H(ctx["mod"])).status_code == 401
        au = requests.get(f"{BASE_URL}/admin/users?q=test_alice_{RUN}", headers=H(at)).json()
        assert len(au) == 1 and au[0]["content_count"] >= 1

    def test_change_password_and_email(self, ctx):
        t = ctx["mod"]
        assert requests.put(f"{BASE_URL}/me/password", headers=H(t), json={"old_password": "bad", "new_password": "xxxxxx"}).status_code == 401
        assert requests.put(f"{BASE_URL}/me/password", headers=H(t), json={"old_password": "secret123", "new_password": "secret456"}).status_code == 200
        r = requests.put(f"{BASE_URL}/me/email", headers=H(t), json={"email": f"test_mod2_{RUN}@ex.com", "password": "secret456"})
        assert r.status_code == 200 and r.json()["email"] == f"test_mod2_{RUN}@ex.com"
