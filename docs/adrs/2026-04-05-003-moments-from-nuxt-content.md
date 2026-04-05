# ADR-3: Moments loaded from Nuxt Content (not IndexedDB) in pages

**Date:** 2026-04-05

**Decision:** Pages query moments via `queryCollection('moments')` (Nuxt Content) rather than from IndexedDB.

**Context:** Moments are static content authored as JSON files in `content/moments/`. The original implementation tried to load them from IndexedDB, which was always empty.

**Rationale:**
- Moments are static editorial content, not user data — Nuxt Content is the right tool
- SSR-compatible: `useAsyncData` + `queryCollection` renders moments server-side
- No seeding step required
- IndexedDB is reserved for user data only (prefs, engagements, gaps, calendar cache)

**Nuxt Content ID caveat:** The collection's internal `id` is the file path (e.g., `moments/moments/breath-1.json`), not the JSON's `id` field. Pages query by `stem` (e.g., `moments/breath-1`) and route params use the clean ID (e.g., `breath-1`). The `/api/moments` endpoint transforms the `stem` back to the clean ID for the service worker.
