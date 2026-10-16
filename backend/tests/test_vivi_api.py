# Vivi Potenza (themes) backend tests: config themes, /vivi/{slug} filters, membership, tagging, struct admin CRUD, backup
import os
import uuid
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"
RUN = uuid.uuid4().hex[:6]
DEFAULT_SLUGS = ["movida", "musica-spettacoli", "corsi", "cultura", "sport", "natura", "sagre", "locali", "shopping", "arte", "famiglie", "community"]


def H(tok=None):
    h = {"Content-Type": "application/json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


@pytest.fixture(scope="module")
def ctx():
    r = requests.post(f"{BASE_URL}/auth/login", json={"identifier": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    at = r.json()["token"]
    u = requests.post(f"{BASE_URL}/auth/register", json={"username": f"TEST_vivi_{RUN}", "email": f"test_vivi_{RUN}@ex.com", "password": "secret123"}).json()
    c = {"admin": at, "user": u["token"], "user_id": u["user"]["id"], "items": [], "themes": []}
    yield c
    for iid in c["items"]:
        requests.delete(f"{BASE_URL}/admin/items/{iid}", headers=H(at))
    for it in requests.get(f"{BASE_URL}/admin/items?status=", headers=H(at)).json():
        if it["title"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/admin/items/{it['id']}", headers=H(at))
    for t in requests.get(f"{BASE_URL}/admin/struct/themes", headers=H(at)).json():
        if t["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/admin/struct/themes/{t['id']}", headers=H(at))
        elif t.get("hidden"):
            requests.put(f"{BASE_URL}/admin/struct/themes/{t['id']}", headers=H(at), json={"hidden": False})
    requests.delete(f"{BASE_URL}/admin/users/{c['user_id']}", headers=H(at))


def cfg_themes():
    return requests.get(f"{BASE_URL}/config").json()["themes"]


class TestPublic:
    def test_config_has_12_default_themes(self):
        th = cfg_themes()
        slugs = [t["slug"] for t in th]
        for s in DEFAULT_SLUGS:
            assert s in slugs
        assert slugs[:12] == DEFAULT_SLUGS
        for t in th:
            assert isinstance(t["count"], int) and isinstance(t["upcoming"], int) and "_id" not in t

    def test_vivi_block_position(self):
        ids = [b["id"] for b in requests.get(f"{BASE_URL}/config").json()["home"]["blocks"]]
        assert "vivi" in ids and ids.index("vivi") > ids.index("trending") and ids.index("vivi") < ids.index("board")

    def test_vivi_theme_shape_and_404(self):
        r = requests.get(f"{BASE_URL}/vivi/locali")
        assert r.status_code == 200
        d = r.json()
        assert d["theme"]["slug"] == "locali" and set(d["facets"]) == {"kinds", "towns"} and isinstance(d["items"], list)
        assert requests.get(f"{BASE_URL}/vivi/nonexistent-xyz").status_code == 404

    def test_count_matches_items(self):
        for t in cfg_themes():
            d = requests.get(f"{BASE_URL}/vivi/{t['slug']}").json()
            assert len(d["items"]) == t["count"], t["slug"]

    def test_when_filters_and_sort(self):
        for slug in ("musica-spettacoli", "locali", "natura", "movida"):
            all_ = requests.get(f"{BASE_URL}/vivi/{slug}").json()["items"]
            perm = requests.get(f"{BASE_URL}/vivi/{slug}", params={"when": "permanent"}).json()["items"]
            assert all(i["kind"] != "event" for i in perm)
            for w in ("tonight", "weekend"):
                r = requests.get(f"{BASE_URL}/vivi/{slug}", params={"when": w})
                assert r.status_code == 200 and all(i["kind"] == "event" for i in r.json()["items"])
            az = [i["title"].lower() for i in requests.get(f"{BASE_URL}/vivi/{slug}", params={"sort": "az"}).json()["items"]]
            assert az == sorted(az)
            assert requests.get(f"{BASE_URL}/vivi/{slug}", params={"sort": "trend"}).status_code == 200
            assert len(perm) <= len(all_)

    def test_kind_town_filters(self):
        d = requests.get(f"{BASE_URL}/vivi/locali").json()
        for k in d["facets"]["kinds"]:
            assert all(i["kind"] == k for i in requests.get(f"{BASE_URL}/vivi/locali", params={"kind": k}).json()["items"])
        for tw in d["facets"]["towns"]:
            assert all(i["town"] == tw for i in requests.get(f"{BASE_URL}/vivi/locali", params={"town": tw}).json()["items"])


class TestMembership:
    def test_subcategory_membership_and_expired(self, ctx):
        at = ctx["admin"]
        today = date.today().isoformat()
        fut = (date.today() + timedelta(days=3)).isoformat()
        past = (date.today() - timedelta(days=10)).isoformat()
        r = requests.post(f"{BASE_URL}/admin/items", headers=H(at), json={"kind": "event", "title": f"TEST_Concerto_{RUN}", "category": "Concerto", "start_date": fut, "start_time": "21:00"})
        assert r.status_code == 200, r.text
        ctx["items"].append(r.json()["id"])
        r2 = requests.post(f"{BASE_URL}/admin/items", headers=H(at), json={"kind": "event", "title": f"TEST_Sagra_{RUN}", "category": "Sagra", "start_date": past, "start_time": "20:00"})
        assert r2.status_code == 200, r2.text
        ctx["items"].append(r2.json()["id"])
        mus = [i["title"] for i in requests.get(f"{BASE_URL}/vivi/musica-spettacoli").json()["items"]]
        assert f"TEST_Concerto_{RUN}" in mus
        sag = [i["title"] for i in requests.get(f"{BASE_URL}/vivi/sagre").json()["items"]]
        assert f"TEST_Sagra_{RUN}" not in sag  # expired excluded
        _ = today

    def test_admin_theme_tag(self, ctx):
        at = ctx["admin"]
        r = requests.post(f"{BASE_URL}/admin/items", headers=H(at), json={"kind": "place", "title": f"TEST_Arte_{RUN}", "category": "Pub", "themes": ["arte"]})
        assert r.status_code == 200, r.text
        ctx["items"].append(r.json()["id"])
        assert "arte" in r.json().get("themes", [])
        titles = [i["title"] for i in requests.get(f"{BASE_URL}/vivi/arte").json()["items"]]
        assert f"TEST_Arte_{RUN}" in titles
        arte = next(t for t in cfg_themes() if t["slug"] == "arte")
        assert arte["count"] >= 1

    def test_user_submission_tag_after_approval(self, ctx):
        r = requests.post(f"{BASE_URL}/submissions/item", headers=H(ctx["user"]), json={"kind": "place", "title": f"TEST_Fam_{RUN}", "category": "Bar", "themes": ["famiglie"]})
        assert r.status_code == 200, r.text
        assert f"TEST_Fam_{RUN}" not in [i["title"] for i in requests.get(f"{BASE_URL}/vivi/famiglie").json()["items"]]
        pend = requests.get(f"{BASE_URL}/admin/pending", headers=H(ctx["admin"])).json()["items"]
        it = next(i for i in pend if i["title"] == f"TEST_Fam_{RUN}")
        ctx["items"].append(it["id"])
        assert it.get("themes") == ["famiglie"]
        assert requests.post(f"{BASE_URL}/admin/items/{it['id']}/status", headers=H(ctx["admin"]), json={"status": "approved"}).status_code == 200
        assert f"TEST_Fam_{RUN}" in [i["title"] for i in requests.get(f"{BASE_URL}/vivi/famiglie").json()["items"]]


class TestStructThemes:
    def test_permissions(self, ctx):
        assert requests.get(f"{BASE_URL}/admin/struct/themes").status_code == 401
        assert requests.post(f"{BASE_URL}/admin/struct/themes", headers=H(ctx["user"]), json={"name": "TEST_x"}).status_code in (401, 403)

    def test_lifecycle(self, ctx):
        at = ctx["admin"]
        r = requests.post(f"{BASE_URL}/admin/struct/themes", headers=H(at), json={"name": f"TEST_Tema {RUN}", "description": "d", "subcategories": ["Pub"]})
        assert r.status_code == 200, r.text
        t = r.json(); tid, slug = t["id"], t["slug"]
        assert t["icon"] == "Sparkles" and t["hidden"] is False
        assert slug in [x["slug"] for x in cfg_themes()]
        d = requests.get(f"{BASE_URL}/vivi/{slug}").json()
        assert all(i["category"] == "Pub" for i in d["items"]) and len(d["items"]) >= 1
        # edit
        r = requests.put(f"{BASE_URL}/admin/struct/themes/{tid}", headers=H(at), json={"name": f"TEST_Tema2 {RUN}", "icon": "Music", "color": "#123456", "image_url": "https://x.com/a.jpg", "subcategories": []})
        assert r.status_code == 200 and r.json()["icon"] == "Music" and r.json()["slug"] == slug
        # tag an item with the new theme
        ir = requests.post(f"{BASE_URL}/admin/items", headers=H(at), json={"kind": "place", "title": f"TEST_TagNew_{RUN}", "category": "Bar", "themes": [slug]})
        iid = ir.json()["id"]; ctx["items"].append(iid)
        assert [i["title"] for i in requests.get(f"{BASE_URL}/vivi/{slug}").json()["items"]] == [f"TEST_TagNew_{RUN}"]
        # hide
        assert requests.put(f"{BASE_URL}/admin/struct/themes/{tid}", headers=H(at), json={"hidden": True}).status_code == 200
        assert slug not in [x["slug"] for x in cfg_themes()]
        assert requests.get(f"{BASE_URL}/vivi/{slug}").status_code == 404
        assert slug in [x["slug"] for x in requests.get(f"{BASE_URL}/admin/struct/themes", headers=H(at)).json()]
        # reorder: move new theme first then restore
        lst = requests.get(f"{BASE_URL}/admin/struct/themes", headers=H(at)).json()
        ids = [x["id"] for x in lst]
        new = [tid] + [i for i in ids if i != tid]
        assert requests.post(f"{BASE_URL}/admin/struct/themes/reorder", headers=H(at), json={"ids": new}).status_code == 200
        assert requests.get(f"{BASE_URL}/admin/struct/themes", headers=H(at)).json()[0]["id"] == tid
        assert requests.post(f"{BASE_URL}/admin/struct/themes/reorder", headers=H(at), json={"ids": [i for i in ids if i != tid] + [tid]}).status_code == 200
        assert [x["slug"] for x in cfg_themes()][:12] == DEFAULT_SLUGS
        # delete -> slug pulled from items
        assert requests.delete(f"{BASE_URL}/admin/struct/themes/{tid}", headers=H(at)).status_code == 200
        items = requests.get(f"{BASE_URL}/admin/items", headers=H(at)).json()
        assert slug not in next(i for i in items if i["id"] == iid).get("themes", [])
        assert requests.delete(f"{BASE_URL}/admin/struct/themes/{tid}", headers=H(at)).status_code == 404

    def test_create_requires_name(self, ctx):
        assert requests.post(f"{BASE_URL}/admin/struct/themes", headers=H(ctx["admin"]), json={"name": " "}).status_code == 422

    def test_hide_default_and_unhide(self, ctx):
        at = ctx["admin"]
        t = next(x for x in requests.get(f"{BASE_URL}/admin/struct/themes", headers=H(at)).json() if x["slug"] == "community")
        requests.put(f"{BASE_URL}/admin/struct/themes/{t['id']}", headers=H(at), json={"hidden": True})
        assert "community" not in [x["slug"] for x in cfg_themes()]
        requests.put(f"{BASE_URL}/admin/struct/themes/{t['id']}", headers=H(at), json={"hidden": False})
        assert [x["slug"] for x in cfg_themes()] == DEFAULT_SLUGS


class TestBackup:
    def test_backup_includes_themes(self, ctx):
        r = requests.get(f"{BASE_URL}/admin/backup", headers=H(ctx["admin"]))
        assert r.status_code == 200, r.text
        d = r.json()
        data = d.get("data", d)
        assert "themes" in data and len(data["themes"]) >= 12
