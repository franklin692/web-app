# Cosa Fare a Potenza – PRD

## Original problem
Mobile-first PWA social radar for Potenza & province (SOMO/MoVita style). v1: Explore, votes "Ci sarò/Ci sono ORA", trend badges, + submit with approval, Spotted, admin panel, seed data.
v2 (approved plan "Cosa Fare a Potenza 2.0"): Bacheca with configurable sections, private replies tied to accounts (secret code & PIN removed), guest/registered permissions, Sondaggio del Giorno, profile inbox/listings/account, and a Cabina di Regia with Super Admin/Admin roles covering moderation, reports, content, dynamic categories, section builder, zones/towns, Home builder + alert, banners & sponsors with stats, texts & rules, users & roles, audit log, backup/restore.

## Architecture
- Backend: FastAPI `server.py` (+ `seed.py`, `seed2.py` defaults), MongoDB collections: items, categories, sections, posts, post_replies, post_reactions, reports, polls, poll_votes, banners, config (_id "app"), users (role user/admin/superadmin, blocked), votes (TTL), saves, audit, files, login_attempts. Bearer JWT; guests via X-Device-Id. Emergent Object Storage for uploads (login required).
- Frontend: React + react-query, vaul sheets, Tailwind; public config via `/api/config` (`useConfig`), dynamic icons (`lib/icons.jsx`). PWA manifest + SW.

## Implemented
- 2026-06 v1 MVP (see iteration_1).
- 2026-06 v2: Bacheca (6 default sections, dynamic fields/tags/reply labels/approval/duration/reactions/partner/expiry), Spotted migrated, login-gated publish/reply/report, poll (hidden results until vote, 1 vote per device+account), profile (Messaggi with unread badge, I miei annunci with edit/complete/delete + reject reason, Salvati, Account), Cabina di Regia (16 tabs super / 7 admin), banners (5 positions, views/clicks), backup export/restore, audit log. Tested iteration_2: backend 20/21 (the failure is fixed), all frontend flows pass. Minor fixes applied afterwards.

- 2026-06 v2.1 "Vivi Potenza": Radar removed from nav (MapRadar page + /mappa route kept for restore), new tab /vivi with 12 admin-managed themes (collection `themes`, STRUCT generic admin, image/icon/color/description/linked subcategories). Membership = item.themes tag OR item.category in theme.subcategories (no fake data). /api/vivi/{slug} with when/kind/town/sort filters, dated vs permanent groups, curated empty states with prefilled "Segnala qualcosa". Home block "vivi" auto-merged into existing config (after ranking). Tested iteration_3: 35/35 backend, all UI flows pass.

## Backlog
- P1: Mappa Radar (Leaflet dark, pins, flame halo); "Copia-Incolla Magico" AI importer; Roulette "Risolvi-Serata"; Pass Vantaggi
- P2: Push notifications, venue manager profiles, sponsor online payments, advanced stats, password reset via email
- Tech: split server.py into routers; explicit CORS origins; drag-and-drop reorder
