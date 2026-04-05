# ADR-4: Middleware uses only non-httpOnly cookies

**Date:** 2026-04-05

**Decision:** The onboarding middleware checks only the `onboarding_complete` cookie — not the Better Auth session cookie.

**Context:** Better Auth's session cookie (`sunlight.session_token`) is httpOnly. Nuxt's `useCookie` reads it from request headers on the server but cannot access it via `document.cookie` on the client. This caused SSR/client hydration mismatches — the server would render one page while the client would redirect to another.

**Rationale:**
- The `onboarding_complete` cookie is set by the app (not httpOnly), so it reads identically on server and client
- Eliminates all hydration mismatches in the middleware
- Simple and predictable: one cookie controls the entire onboarding flow

**Trade-off:** A user could manually set the `onboarding_complete` cookie to bypass onboarding. This is low risk — the app gracefully handles missing preferences by falling back to defaults.
