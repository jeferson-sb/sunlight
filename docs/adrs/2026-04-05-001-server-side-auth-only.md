# ADR-1: Server-side authentication only (no client-side tokens)

**Date:** 2026-04-05

**Decision:** Remove the IndexedDB `tokens` table and `TokenEncryption` class. All auth tokens are managed server-side by Better Auth in Cloudflare D1.

**Context:** The original spec assumed OAuth tokens would be stored client-side in IndexedDB with AES-GCM encryption. Better Auth was adopted instead, which stores sessions in D1 with httpOnly cookies.

**Rationale:**
- httpOnly cookies prevent XSS from accessing tokens
- No client-side encryption complexity to maintain
- Token refresh is handled server-side transparently
- The service worker accesses authenticated endpoints via `credentials: 'include'` on same-origin fetches

**Trade-off:** The service worker cannot make authenticated requests when fully offline. This is acceptable because push notifications (which wake the SW) require network connectivity.
