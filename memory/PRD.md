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

- 2026-06 v2.2 Gemini AI (gemini-3-flash-preview, Emergent LLM key): "Lucy" assistant in + (users) and Admin direct insert — chat with SSE streaming, reads text, public links (og tags, SSRF-safe fetch) and poster images, returns validated draft -> prefilled form (still goes through approval). Background AI moderation on user posts/items (ai_review low/medium/high; high-risk auto-published posts held pending), badges + re-analyze in admin queue. Tested iteration_4: 9/9 AI + 35/35 regression.

## Backlog
- P1: Mappa Radar (Leaflet dark, pins, flame halo); "Copia-Incolla Magico" AI importer; Roulette "Risolvi-Serata"; Pass Vantaggi
- P2: Push notifications, venue manager profiles, sponsor online payments, advanced stats, password reset via email
- Tech: split server.py into routers; explicit CORS origins; drag-and-drop reorder


## v3.0 – Città viva, live e pratica (Oct 2026)
- AI (Gemini/Lucy, AI moderation) REMOVED entirely; zero AI cost. Old ai_review data kept in DB, not shown.
- New "+" menu in blocks (Pubblica in città / Segnalazione rapida live / Bacheca) + Proponi & Contattaci.
- Votes "Ci sarò 👋" / "Ci sono ORA 📍"; Explore dual ranking ADESSO (live) / Dove si va (7 days); "Da scoprire ✨".
- Segui 🔔 (venues/places) vs Salva ⭐ (events, courses, board posts); calendar ICS + Google link; Profile tabs Messaggi/Seguiti/Salvati/I miei annunci/Account.
- Auto-archive past events (status archived, on read, no cron); admin Archivio with delete & duplicate-with-new-date.
- Potenza Live reports (3h TTL, confirm once), Spotlight (3h, needs "Ci sono ORA", waves to inbox), Spotlight filter.
- /info-utili: fuel stations (community prices, sort, update) + Info pratiche; admin CRUD; seeded 5 stations, 4 info cards, 2 fresh live reports each startup.
- Proposals, /contatti (form + super-admin quick links), newsletter (Explore box, register, profile) – emails collected only; admin "Proposte & Contatti" with CSV.
- Sorprendimi 🎲, "Segnala info errata o abuso" for guests too, Spotted privacy note, admin Risposte tab removed.
- Backend new code in backend/v3.py. Tests: backend/tests/test_v3_api.py 13/13, v2/vivi regression 35/35 (run with -n 0).

## Backlog
- P1: Newsletter sending from platform; notifications for Seguiti; moderation of false live reports
- P2: Official fuel price import (MIMIT open data); map with live reports & stations; venue pages with stats

## v3.1 (Oct 2026)
- Fix: Spotlight list public to all (guests read-only), auto-refresh 30s; item live reports include zone reports; tz-aware timestamps.
- Bottom nav: Esplora · Info · Vivi (center) · Bacheca · Profilo; sticky TopBar with "＋ Pubblica" (+ buttons in Bacheca/Vivi/Info).
- New Info hub (/info): Promozioni & Volantini (/info/promo, user proposals pending until admin sets Visibile), Benzina, Info Utili (+Numeri utili), Live (/info/live).
- Add sheet: 3 group cards (Vivi / Bacheca / Info-Promo-Segnalazioni).
- Spotted = message only (migration); Explore block "📌 Dalla Bacheca (I più cliccati)" with unique view counter (/api/board-top, /api/posts/{id}/view).
- Tests iteration_6: backend 52/52, frontend flows 100%.
