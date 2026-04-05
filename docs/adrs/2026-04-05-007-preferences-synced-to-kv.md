# ADR-7: User preferences synced to KV for reinstallation resilience

**Date:** 2026-04-05

**Decision:** `style` and `week_number` are persisted to Cloudflare KV via `POST /api/user/preferences`, in addition to IndexedDB.

**Context:** The spec requires that style preference and week number survive app reinstallation or browser data clearing.

**Rationale:**
- IndexedDB is ephemeral — users can clear it, or browsers may evict it under storage pressure
- KV is durable server-side storage, keyed by user ID
- Only two fields are synced (low write volume, fits KV's eventual consistency model)
- Other prefs (working hours, dismissal count, last notification time) are client-only and transient

**Trade-off:** The KV write is best-effort — if it fails, the local save still succeeds and the user proceeds normally. A warning toast is shown but doesn't block navigation.
