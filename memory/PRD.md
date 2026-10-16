# Cosa Fare a Potenza – PRD

## Original problem
Mobile-first PWA social radar for Potenza & province (SOMO/MoVita style): Explore feed, Map Radar, central "+" universal submit (admin approval), Spotted board, Admin panel. Anonymous "Ci sarò"/"Ci sono ORA" votes with trend badges (no low numbers, threshold 20), admin boost, featured carousel, seed data. Approved plan adds: search, Stasera/Weekend/Tutti filters, share, user accounts (Accedi/Profilo with saved, my spotted + private replies, my submissions), guest spotted secret code, admin via admin account or PIN, map = placeholder in Phase 1.

## Architecture
- Backend: FastAPI single `server.py` + `seed.py`, MongoDB (items, spotted, votes w/ TTL, saves, spotted_reactions, spotted_replies, users, settings, login_attempts, files). Bearer JWT (localStorage), guest identity via X-Device-Id. Emergent Object Storage for image uploads (/api/upload, /api/files/*).
- Frontend: React + react-query + vaul bottom sheets, Tailwind, Outfit/Plus Jakarta Sans, dark neon theme. PWA manifest + service worker (network-first, offline shell).

## Implemented (2026-06)
- Explore: search, time + category filters, featured carousel, live ranking, list, detail sheet (vote/save/share, deep link /item/:id)
- Votes: 1 presence per voter/item, switch/cancel, expiry (going: event end or 12h; here: 4h), past events hidden
- + sheet with 5 types, photo upload/URL, pending submissions, guest spotted code
- Spotted: tag filters, reactions toggle, private replies, code lookup, share link
- Auth: register/login (email or username), profile tabs; brute-force lockout (X-Forwarded-For)
- Admin: queue (approve / edit+approve / reject / delete), direct insert, CRUD, featured, boost +5/+10/+25/reset, spotted mgmt, replies, threshold & PIN settings
- Seed: 5 places, 3 venues, 4 events, 3 activities, 4 spotted + 3 pending
- Tested: iteration_1 backend 21/22 (brute-force fixed after), frontend flows pass

## Backlog
- P1: Map Radar (Leaflet CartoDB Dark Matter, category pins, flame halo)
- P1: Merge guest saves/votes into account on login; localized date picker
- P2: Push notifications, content reporting, password reset via email
- P3: Venue manager profiles, admin stats, multi-admin roles, promoted slots
