# Auth Testing Playbook (Cosa Fare a Potenza)

Auth uses Bearer JWT tokens (returned in JSON body, stored in localStorage on frontend), not cookies.

1. Mongo: `db.users.find({role:"admin"})` -> password_hash starts with `$2b$`. Unique indexes on users.email and users.username_lower.
2. API:
```
curl -X POST $URL/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"admin","password":"admin123"}'
curl $URL/api/auth/me -H "Authorization: Bearer <token>"
curl -X POST $URL/api/admin/pin -H "Content-Type: application/json" -d '{"pin":"admin123"}'
curl $URL/api/admin/pending -H "Authorization: Bearer <admin or pin token>"
```
3. 5 failed logins for same ip:identifier -> 429 for 15 min.
