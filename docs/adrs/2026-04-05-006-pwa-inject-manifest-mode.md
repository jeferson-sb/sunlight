# ADR-6: PWA uses injectManifest mode

**Date:** 2026-04-05

**Decision:** Switch from Workbox's `generateSW` mode to `injectManifest` for full control over the service worker.

**Context:** The default `@vite-pwa/nuxt` configuration generates a Workbox service worker automatically. Custom push notification handling requires a hand-written service worker.

**Rationale:**
- `injectManifest` lets us write `app/sw.ts` with custom push, notification click/close, and message handlers
- Workbox precaching is retained via `precacheAndRoute(self.__WB_MANIFEST)`
- Vite bundles `sw.ts`, so we can import `detectGaps`, `selectMoment`, and other utilities directly
- TypeScript support with `app/types/sw.d.ts` for service worker globals
