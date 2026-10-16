# Cleanup TEST_ data created by tests (items, spotted) via admin API
import requests
from test_cosafare_api import API, ADMIN_PIN

h = {"Authorization": "Bearer " + requests.post(f"{API}/admin/pin", json={"pin": ADMIN_PIN}).json()["token"]}
n = 0
for st in ("approved", "pending", "rejected"):
    for it in requests.get(f"{API}/admin/items", params={"status": st}, headers=h).json():
        if it["title"].startswith("TEST_"):
            requests.delete(f"{API}/admin/items/{it['id']}", headers=h); n += 1
for s in requests.get(f"{API}/admin/spotted", headers=h).json():
    if s["where"].startswith("TEST_"):
        requests.delete(f"{API}/admin/spotted/{s['id']}", headers=h); n += 1
print("deleted", n, "threshold", requests.get(f"{API}/admin/settings", headers=h).json())
