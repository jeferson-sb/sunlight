# Sunlight — Product Specification

**Version:** 1.0
**Status:** Pre-development
**Timeline:** 2 weeks to production
**Author:** Jeff + AI

---

## 1. Vision

Most wellness apps wait for you to show up. Sunlight shows up for you.

Sunlight is a zero-config, calendar-aware micro-wellness companion for knowledge workers. It finds the quiet spaces in your workday — the 8 minutes before your next meeting, the gap after a 3-hour block — and surfaces a small, meaningful moment designed to help you breathe, reset, and keep going. No journaling habit to build. No streaks to maintain. No settings to configure.

It works in the background. You barely notice it until you realise your days feel lighter.

---

## 2. Target Audience

**Primary:** Software engineers, product managers, and designers at startups and tech companies — people whose days are shaped by calendars, back-to-back meetings, and the cognitive weight of knowledge work.

**Secondary:** Any knowledge worker who uses Google Calendar and has a job that lives in their head.

**What they share:**
- Calendar-driven workdays with unpredictable gaps
- Awareness that they should take breaks, but rarely do
- Scepticism toward "wellness apps" — too much setup, too much guilt
- Enough self-awareness to notice when burnout is creeping in
- No prior experience with meditation or breathwork required

---

## 3. Core Principles

**Zero config.** The only setup is connecting Google Calendar and picking a content style. Everything else is inferred.

**Ambient, not demanding.** Sunlight lives in the background. It never asks you to open it. It finds you.

**Simple beats complete.** One well-executed micro-moment beats a library of features no one uses. Every decision should reduce surface area, not expand it.

**Less and more meaningful data.** No streaks. No scores. No dashboards. One weekly insight that actually means something.

**Emotionally aware, not emotionally flat.** The app names what's happening in your day — not just what to do about it.

**Privacy first.** All behavioural data stays on-device (IndexedDB). The server holds only what's technically required: account identity and push subscription.

---

## 4. What Sunlight Is Not

- Not a meditation app. Sessions are 1–5 minutes, not 20.
- Not a habit tracker. No streaks, no daily goals.
- Not a journaling app. Reflections are optional and ephemeral.
- Not a productivity tool. It is explicitly anti-productivity-guilt.
- Not a team tool in v1. It is personal and private.
- Not monetised in v1. Free for all users, no paywalls.

---

## 5. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Nuxt 3 (App Router) | SSR + server routes on Cloudflare Workers |
| CSS | Open-props + scoped component CSS | No utility class framework |
| Client storage | IndexedDB via Dexie.js | All behavioural data stays on device |
| Server storage | Cloudflare KV | Account identity + push subscription only |
| Auth | Google OAuth 2.0 | Calendar access + account identity |
| Calendar | Google Calendar API | v1 only. Outlook is post-launch. |
| Background jobs | Cloudflare Cron Trigger | Fires every 30 min, sends silent push |
| Notifications | Web Push API (VAPID) | `web-push` library |
| AI | Gemini Flash (free tier) | Copy variation + weekly insight phrasing |
| Deployment | Cloudflare Pages + Workers | Pages for app, Workers for server routes + cron |
| PWA | `@vite-pwa/nuxt` | Installable, offline-capable |

---

## 6. Architecture

### Overview

```
Cloudflare Cron (every 30min)
  └── reads push subscriptions from KV
      └── sends silent push (no payload) to each subscriber

Service Worker (client, wakes on silent push)
  └── reads OAuth tokens from IndexedDB
  └── refreshes token if expired → Google token endpoint
  └── fetches today's events → Google Calendar API
  └── runs gap detection algorithm
  └── runs content selection engine
  └── if gap qualifies → shows visible notification
  └── writes gap + selected moment to IndexedDB

User taps notification
  └── opens /moment/[id] in Nuxt app
  └── engagement recorded to IndexedDB
```

### Server-side (Cloudflare Workers — Nuxt server routes)

| Route | Purpose |
|---|---|
| `GET /api/auth/google` | Initiates OAuth, redirects to Google |
| `GET /api/auth/google/callback` | Exchanges code for tokens, stores user in KV, returns tokens to client via one-time redirect (never in URL params) |
| `POST /api/push/subscribe` | Stores push subscription object in KV under user ID |
| `DELETE /api/push/unsubscribe` | Removes push subscription from KV |
| Cron trigger | Reads all active subscriptions from KV, sends silent push to each |

### Client-side (IndexedDB via Dexie.js)

All behavioural data lives here. Never sent to the server.

| Table | Fields |
|---|---|
| `tokens` | `access_token`, `refresh_token`, `expires_at` — encrypted with AES-GCM via Web Crypto API |
| `events` | `id`, `title`, `start`, `end`, `isAllDay` — today's calendar cache |
| `gaps` | `id`, `start`, `end`, `duration_minutes`, `moment_id_served`, `notified_at` |
| `moments` | Full micro-moment library, loaded from bundled JSON on first open |
| `engagements` | `moment_id`, `gap_id`, `action` (`completed` / `dismissed` / `skipped`), `timestamp` |
| `prefs` | `style` (`direct` / `reflective`), `voice` (`a` / `b`), `week_number`, `last_notified_at`, `consecutive_dismissals`, `working_hours_start`, `working_hours_end`, `last_insight` |

### Server-side KV schema (per user)

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "push_subscription": { /* Web Push subscription object */ },
  "style_preference": "direct | reflective",
  "week_number": 1,
  "active": true,
  "created_at": "ISO timestamp"
}
```

Style preference and week number are stored server-side so they survive reinstallation.

### Gap Detection Algorithm

Runs inside the Service Worker on every silent push.

**Input:** today's calendar events, current time, user prefs
**Rules:**
1. Gap must be between 5 and 45 minutes
2. Gap must fall within working hours (default 8am–6pm, inferred from event patterns after week 1)
3. Last notification must have been more than 2 hours ago (`prefs.last_notified_at`)
4. If `prefs.consecutive_dismissals >= 3`, skip and reset counter next day
5. Only gaps starting within the next 60 minutes are considered

**Output:** next qualifying gap object, or `null`

### Content Selection Engine

Runs immediately after gap detection returns a qualifying gap.

**Scoring factors:**
- Gap duration → filters by `min_duration` and `max_duration` on each moment
- Time of day → morning moments weighted toward physical/grounding, afternoon toward reflection
- Week number → content unlock threshold (`available_from_week`)
- Style preference → direct vs. reflective copy variant
- Recency → penalise moment types seen in the last 48 hours
- Engagement history → penalise types with high dismissal rate for this user

**Gemini integration:** optional, non-blocking. After selection, call Gemini Flash to generate a copy variation of the selected moment. Falls back silently to static copy on failure or timeout (2s max).

### Token Security

OAuth tokens stored in IndexedDB encrypted with `AES-GCM` using the Web Crypto API. Encryption key is derived per-device from a random secret generated at install time and stored in `localStorage`. Tokens never leave the client.

---

## 7. User Flows

### 7.1 Onboarding

Three screens. No forms.

**Screen 1 — Connect**
> *"Sunlight finds the quiet moments in your day."*
> [Connect Google Calendar →]

Triggers Google OAuth. Requests scopes: `calendar.readonly`, `openid`, `email`.

**Screen 2 — Style**
> *"How do you like to receive things?"*

Two full-width cards:
- **"Just tell me what to do"** — direct tone, action-first copy
- **"Help me understand why"** — reflective tone, context-first copy

Single tap. No confirm button.

**Screen 3 — Done**
> *"That's everything. We'll take it from here."*
>
> *"When you have a gap between meetings, we'll let you know."*

[→ takes user to the ambient status view]

No notification permission is requested here. See section 7.3.

---

### 7.2 Daily Ambient Flow

The user does nothing.

1. CF Cron fires every 30 minutes
2. Silent push sent to user's subscription
3. Service Worker wakes, fetches calendar, runs gap detection
4. If a qualifying gap is found → visible notification:
   > *"You have 9 minutes before your next call. Want to use them?"*
5. User taps → `/moment/[id]` opens
6. User completes or dismisses → engagement recorded → back to their day

---

### 7.3 Notification Permission Flow

Permission is requested contextually — not during onboarding.

On the first detected gap, instead of firing a notification directly (which would fail without permission), the app opens a gentle in-app prompt:

> *"You have 10 minutes before your next meeting."*
>
> *"Can Sunlight send you a nudge next time? It'll only happen when you have a real gap."*

[Allow] [Not now]

If allowed → `Notification.requestPermission()` → subscribe to push → POST to `/api/push/subscribe`.
If denied → app continues silently, no retry for 7 days.

---

### 7.4 Micro-moment Screen (`/moment/[id]`)

Opened from a notification tap or from the ambient status view (manual trigger).

**Layout (full screen, warm background):**
- Moment copy — large, centred, calm
- Duration indicator — subtle, bottom of screen (e.g. "~3 minutes")
- "Why this works" — collapsed by default, one tap to expand (single sentence)
- Two actions: [Done for now ✓] [Skip →]

**On "Done":** writes `completed` engagement, resets `consecutive_dismissals` to 0, shows a brief exit animation, closes.
**On "Skip":** writes `skipped` engagement, increments `consecutive_dismissals`, closes.
**On notification close (without opening):** Service Worker writes `dismissed` engagement, increments `consecutive_dismissals`.

---

### 7.5 Ambient Status View (`/`)

What the user sees when they open the app directly. Minimal. Nothing to interact with.

**Content (single screen, no scroll):**
- Next detected gap (time + duration) — or "No gaps detected today" if none
- Last moment served (title + when) — or empty if first day
- Weekly insight if it's Sunday evening and one is available
- Small icon link to settings (calendar reconnect, style preference)

No charts. No stats. No history view.

---

### 7.6 Weekly Insight (`/insight`)

Triggered by a notification on Sunday around 6pm. Also accessible from the ambient status view on Sundays.

**Single screen, no scroll:**

> *"This week had 14 gaps in your day. You paused in 6 of them. The ones after your longest meetings seemed to help most."*

One paragraph. Generated by combining IndexedDB engagement data + Gemini Flash to match the user's style preference. Stored in `prefs.last_insight`.

Notification copy:
> *"Your week in one thought — tap to read."*

---

### 7.7 Error States

| Situation | Behaviour |
|---|---|
| Google Calendar disconnected / token invalid | Ambient status shows: *"Your calendar connection needs a refresh."* [Reconnect →] |
| Notification permission denied | No notification sent. App functions normally when opened manually. |
| No gaps detected today | No notification. Normal. No error shown. |
| Gemini API fails | Fall back to static copy silently. No user-visible error. |
| User dismisses 3 moments in a row | Back off for 24 hours. Soft reset on the following morning. |
| Offline | App fully functional offline — moment screen, status view, insight all read from IndexedDB. Calendar sync deferred until online. |

---

## 8. Micro-moments Content Spec

### Types

| Type | Duration | Description |
|---|---|---|
| `breath` | 1–3 min | Guided breath reset. Single animation, minimal copy. |
| `physical` | 2–4 min | Movement prompt. Stand up, stretch, step outside. |
| `grounding` | 1–3 min | Sensory attention prompt. Name what you see, hear, feel. |
| `reflection` | 3–5 min | Single open question. Optional ephemeral text input. |
| `sensory` | 2–5 min | Ambient soundscape with a timer. No UI chrome. |

### Progressive Arc (unlocks silently, no user notification)

| Week | Available types |
|---|---|
| 1–2 | `breath`, `physical` |
| 3–4 | + `grounding` |
| 5+ | + `reflection`, `sensory` |

### Content Structure (per moment, JSON)

```json
{
  "id": "uuid",
  "type": "breath",
  "copy": "One breath before your next call.",
  "why_it_works": "Deep breathing activates your parasympathetic nervous system and lowers cortisol within 60 seconds.",
  "min_duration": 5,
  "max_duration": 45,
  "style": "direct",
  "available_from_week": 1,
  "tags": ["morning", "pre-meeting"]
}
```

### Voice Variants

Each moment has two copy variants — one per style preference (`direct` / `reflective`). The tone differences:

**Direct:**
> *"Stand up. Roll your shoulders back. You've been still for 90 minutes."*

**Reflective:**
> *"Your body has been holding a lot this morning. Take a moment to move through it."*

Same action. Different entry point. Neither is gendered — they differ in framing, not in audience assumptions.

### Target library size at launch

25–30 moments covering all types available in weeks 1–2, with 10–15 additional moments for weeks 3+. Each moment has both style variants, totalling ~50–60 copy entries.

---

## 9. Design System

**Name:** Sunlight
**Logo:** Half-sun on horizon, wordmark only. Clean. No drop shadow.
**Colour palette (Open-props tokens):**

| Token | Value | Use |
|---|---|---|
| `--surface` | `#FFFDF5` | App background |
| `--surface-2` | `#FFF8E1` | Card backgrounds |
| `--accent` | `#F5C842` | Primary actions, highlights |
| `--accent-soft` | `#FFF3CD` | Subtle highlights, hover states |
| `--text` | `#2C2A1E` | Body text |
| `--text-muted` | `#8A8572` | Secondary text, labels |
| `--success` | `#7EB87A` | Completion states |

**Typography:** System font stack. No web fonts in v1 — keeps it fast and device-native.
**Motion:** Subtle brightness transition when a moment opens (mimics light coming in). Ease-out, 400ms. No bounce, no flash.
**Radius:** Generous — `var(--radius-3)` from Open-props throughout.
**Shadows:** Avoided. Depth through colour, not shadow.

---

## 10. PWA Configuration

- **Name:** Sunlight
- **Short name:** Sunlight
- **Theme colour:** `#FFF3CD`
- **Background colour:** `#FFFDF5`
- **Display:** `standalone`
- **Icons:** 192×192 and 512×512 (half-sun logo on warm background)
- **Start URL:** `/`
- **Scope:** `/`
- **Service Worker:** handles push events, notification clicks, offline caching

---

## 11. Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | CF Pages + client build | Web Push public key |
| `VAPID_PRIVATE_KEY` | CF Workers secret | Web Push private key |
| `VAPID_EMAIL` | CF Workers | Contact email for push service |
| `GOOGLE_CLIENT_ID` | CF Workers | OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | CF Workers | OAuth app client secret |
| `GOOGLE_REDIRECT_URI` | CF Workers | OAuth callback URL |
| `GEMINI_API_KEY` | CF Workers | Gemini Flash API key |

---

## 12. Agent Task Breakdown

### Task 1 — Project Scaffold
Set up Nuxt 3 with Cloudflare Pages adapter (`@nuxthub/core` or `nitro` CF preset). Install: `dexie`, `web-push`, `@vite-pwa/nuxt`, `open-props`. Configure PWA manifest with Sunlight branding. Set up folder structure: `/composables`, `/server/routes`, `/content/moments`, `/public/sw`. Generate VAPID key pair, document as environment variables. Configure `wrangler.toml` for Pages + Workers + KV namespace.

**Deliverable:** Running Nuxt app on localhost deploying to CF Pages with PWA manifest passing Lighthouse audit.

---

### Task 2 — IndexedDB Layer
Define Dexie schema for all tables: `tokens`, `events`, `gaps`, `moments`, `engagements`, `prefs`. Implement encryption/decryption of token table using Web Crypto API (`AES-GCM`). Write composable `useDB()` exporting typed CRUD for each table. Write unit tests for: encryption round-trip, all CRUD operations, schema migration (version 1 → future-proofed).

**Deliverable:** `useDB()` composable, fully tested.

---

### Task 3 — Google OAuth Flow
Server route `GET /api/auth/google` — builds Google OAuth URL with scopes `calendar.readonly openid email`, redirects. Server route `GET /api/auth/google/callback` — exchanges code for tokens, stores `{ user_id, email, active, created_at, style_preference, week_number }` in KV, issues a one-time short-lived token (signed JWT, 60s TTL) and redirects client to `/?token=[jwt]`. Client composable `useAuth()` — on mount, checks for `?token=` in URL, exchanges for tokens via secure local call, encrypts and stores in IndexedDB via `useDB()`, clears URL param. Implements token refresh: if `expires_at` within 5 minutes, refreshes silently against Google token endpoint. Write integration tests for full OAuth round-trip and refresh flow.

**Deliverable:** Working Google OAuth flow, tokens encrypted in IndexedDB.

---

### Task 4 — Google Calendar API Client
Composable `useCalendar()`. Method `fetchTodayEvents()`: fetches events for today + tomorrow from Google Calendar API using token from `useDB()`, normalises to `{ id, title, start, end, isAllDay }`, filters out all-day events, writes to IndexedDB `events` table with a 15-minute cache (skip fetch if cache is fresh). Handles token refresh via `useAuth()`. Write unit tests with mocked API responses: no events, overlapping events, all-day events only, events spanning midnight, timezone edge cases, API error/retry.

**Deliverable:** `useCalendar()` composable, fully tested.

---

### Task 5 — Gap Detection Algorithm
Pure function `detectGaps(events, now, prefs)`. Sorts events by start time. Finds all gaps between consecutive events. Filters by: duration 5–45 min, within working hours (prefs or 8am–6pm default), gap starts within next 60 minutes. Applies backoff rules: `last_notified_at` within 2 hours → skip; `consecutive_dismissals >= 3` → skip. Returns next qualifying gap or `null`. Write exhaustive unit tests: back-to-back meetings, no gaps, gap outside hours, gap too short/long, backoff active, multiple qualifying gaps (returns soonest), empty events array.

**Deliverable:** `detectGaps()` pure function with full test coverage.

---

### Task 6 — Micro-moment Content Library
Write 25–30 micro-moments as structured JSON in `/content/moments.json`. Cover types: `breath` (×8), `physical` (×7), `grounding` (×6), `reflection` (×5), `sensory` (×4). Each moment has both style variants (`direct` / `reflective`). Respect `available_from_week` (1 or 3 or 5). Write copy that is warm, specific, human — not generic wellness-app copy. Include `why_it_works` for every moment (one sentence, evidence-based). Write composable `useMoments()` that loads the JSON into IndexedDB on first open and provides `selectMoment(gap, prefs, engagements)` — the scoring/selection function as specified in the architecture section.

**Deliverable:** `moments.json` (complete library) + `useMoments()` composable.

---

### Task 7 — Web Push Infrastructure
Generate VAPID keys (documented as env vars). Install `web-push` in Nitro server. Server route `POST /api/push/subscribe`: validates body, stores subscription under user ID in KV. Server route `DELETE /api/push/unsubscribe`: removes subscription from KV. Cloudflare Cron Trigger (`wrangler.toml`, every 30 min): reads all active subscriptions from KV, sends silent push (`{ urgency: 'low', TTL: 1800 }`, empty body) to each. Client composable `usePush()`: checks notification permission state, subscribes to push using VAPID public key, POSTs subscription to `/api/push/subscribe`. Write test for cron dispatch logic with mock KV and subscriptions.

**Deliverable:** Working push infrastructure, cron confirmed firing in CF dashboard.

---

### Task 8 — Service Worker
Handle `push` event: wake up → call `detectGaps()` (reads events from IndexedDB) → call `selectMoment()` → if qualifying gap found, call `self.registration.showNotification()` with moment copy as body and moment ID in data payload. Update `prefs.last_notified_at` and reset/increment `consecutive_dismissals` accordingly. Handle `notificationclick`: `clients.openWindow('/moment/' + event.notification.data.moment_id)`. Handle `notificationclose`: write `dismissed` engagement to IndexedDB, increment `consecutive_dismissals`. Handle push permission prompt trigger: when gap detected but no permission yet, post message to app client to show in-app permission prompt. Ensure all IndexedDB access uses same Dexie instance as app via shared composable.

**Deliverable:** Fully wired Service Worker. End-to-end test: silent push → notification → tap → moment screen.

---

### Task 9 — Onboarding Flow
Pages: `/onboarding/connect`, `/onboarding/style`, `/onboarding/done`. Guard in `middleware/onboarding.ts`: if `prefs.style` already set, redirect to `/`. Screen 1: Sunlight logo + headline + Google connect button (triggers `useAuth()` OAuth flow). Screen 2: two style cards, single tap to select, writes to `prefs` and KV. Screen 3: confirmation copy, auto-redirects to `/` after 2 seconds. Apply full Sunlight design system throughout. Responsive — works on mobile and desktop.

**Deliverable:** Complete onboarding flow, guarded, styled.

---

### Task 10 — Micro-moment Screen
Page `/moment/[id]`. On mount: loads moment from IndexedDB by ID (falls back to fetching from `moments.json` if not cached). Renders: moment copy (large, centred), duration indicator (subtle, bottom), "why this works" (collapsed, tap to expand — single sentence). Two actions: [Done for now ✓] [Skip →]. On "Done": write `completed` engagement, reset `consecutive_dismissals` to 0, brief success animation, close/navigate back. On "Skip": write `skipped` engagement, increment `consecutive_dismissals`, close. Handles direct URL access from notification click (app may not be running). Full-screen warm design, no navigation chrome visible.

**Deliverable:** Micro-moment screen, fully wired to IndexedDB engagement tracking.

---

### Task 11 — Notification Permission Flow
In `usePush()` composable: when Service Worker detects a qualifying gap but `Notification.permission !== 'granted'`, post a message to the active client. In the Nuxt app, listen for this message and show a bottom-sheet prompt: *"You have X minutes before your next meeting. Can Sunlight send you a nudge next time?"* with [Allow] and [Not now] buttons. On Allow: call `Notification.requestPermission()`, if granted → subscribe → POST to `/api/push/subscribe`. On deny or "Not now": store `permission_declined_at` in `prefs`, do not retry for 7 days. Style prompt with Sunlight design system (warm, soft, not alarming).

**Deliverable:** Contextual permission prompt, fully wired.

---

### Task 12 — Ambient Status View + Weekly Insight
Page `/` (ambient status). Shows: next detected gap (label + time remaining), last moment served (title + relative time), weekly insight paragraph if Sunday evening and `prefs.last_insight` exists, small settings icon (bottom right). No charts, no scroll. Weekly insight generation: composable `useInsight()` runs on Sunday evenings (triggered by Service Worker push), reads `gaps` and `engagements` from IndexedDB for the past 7 days, constructs a data summary, calls Gemini Flash to generate one paragraph matching user style, stores in `prefs.last_insight`. Notification sent: *"Your week in one thought — tap to read."* Route `/insight` renders the insight paragraph full-screen.

**Deliverable:** Ambient status view, weekly insight generation + screen.

---

### Task 13 — Deployment + QA
Configure `wrangler.toml` for Pages + Workers + KV + Cron. Set all environment variables in CF dashboard. Run production build, confirm no SSR errors. Lighthouse audit: PWA score ≥ 90, performance ≥ 85. Confirm push end-to-end in production (silent push → SW wakes → notification fires). Confirm OAuth flow in production (redirect URIs, KV writes). Confirm KV cron trigger in CF dashboard. Set up Cloudflare Web Analytics (no cookies, privacy-safe). Write brief runbook: how to rotate VAPID keys, how to add moments to the library, how to monitor KV usage.

**Deliverable:** Live production app on `sunlight.app` (or chosen domain), Lighthouse passing, push confirmed working.

---

## 13. Task Dependency Map

```
Task 1 (Scaffold)
├── Task 2 (IndexedDB)
│   ├── Task 3 (OAuth) → Task 4 (Calendar) → Task 5 (Gap detection)
│   ├── Task 9 (Onboarding)
│   ├── Task 10 (Moment screen)
│   └── Task 12 (Status + insight)
├── Task 6 (Content library)
│   └── Task 10 (Moment screen)
├── Task 7 (Push infra)
│   └── Task 8 (Service Worker) ← depends on Tasks 2, 4, 5, 6, 7
│       └── Task 11 (Permission flow)
└── Task 13 (Deploy) ← depends on all tasks
```

**Critical path:** 1 → 2 → 3 → 4 → 5 → 8 → 13

**Can start in parallel on day 1:** Tasks 1, then immediately 2, 6, 7, 9

---

## 14. Out of Scope for v1

- Outlook / Microsoft Graph calendar integration
- Text-to-speech narration
- Team features or shared insights
- Monetisation, Stripe, or subscription gating
- Android / iOS native apps
- Cross-device data sync beyond account identity and preferences
- Dark mode
- Push notification scheduling server-side (all intelligence is client-side)
- In-app moment library browsing
- User-configurable working hours (inferred only)