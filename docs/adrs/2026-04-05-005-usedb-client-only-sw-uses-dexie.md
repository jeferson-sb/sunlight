# ADR-5: useDB is client-only; service worker uses Dexie directly

**Date:** 2026-04-05

**Decision:** The `useDB()` composable retains its `import.meta.client` SSR guard. The service worker instantiates Dexie directly with the same schema.

**Context:** `import.meta.client` is a Nuxt/Vite compile-time constant that is `false` in both SSR and service worker contexts. The SW needs IndexedDB access for prefs and engagements.

**Rationale:**
- `useDB()` is a Nuxt composable — it uses auto-imports and Vue reactivity patterns unsuitable for SW scope
- The `SunlightDB` class uses `private constructor` (singleton pattern), making it non-importable externally
- Dexie is lightweight and the schema definition is small (~5 lines)
- Duplicating the schema in `sw.ts` is a minor maintenance cost for clear separation of concerns

**Trade-off:** Schema changes must be updated in two places (`useDB.ts` and `sw.ts`). With only 4 tables and infrequent schema changes, this is manageable.
