# ADR-2: Service worker fetches moments from server (no IndexedDB seeding)

**Date:** 2026-04-05

**Decision:** The service worker fetches moments via `GET /api/moments` instead of reading from a seeded IndexedDB `moments` table.

**Context:** The original plan proposed adding a `moments` table to IndexedDB (schema v3) with a client plugin that seeds all ~30 moments from Nuxt Content on first app load.

**Rationale:**
- Avoids duplicating static content data between Nuxt Content and IndexedDB
- No schema migration, no seeding plugin, no cache invalidation logic
- Moments are static read-only data (~30 items, <10KB total) — the fetch is fast
- Push notifications inherently require network (the push itself arrives over the network)

**Trade-off:** Moments are not available offline in the service worker. If the `/api/moments` fetch fails, the SW silently exits without showing a notification. The main app still works offline via Workbox precaching since it uses `queryCollection` (SSR-rendered).
