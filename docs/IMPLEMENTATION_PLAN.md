# Sunlight App — Implementation Plan

## Overview
Production-ready wellness PWA with calendar integration and micro-moments. Full stack: Nuxt 3, Cloudflare, IndexedDB, Web Push, Google OAuth.

## Phase 0: Documentation & Reference Gathering

### Objective
Verify all APIs, patterns, and configurations before implementation.

### Tasks
1. **Framework Documentation**
   - Nuxt 3 with Cloudflare Pages adapter setup
   - @vite-pwa/nuxt configuration for PWA
   - Open-props CSS framework integration
   - Verify Dexie.js API patterns

2. **Integration Documentation**
   - Google OAuth 2.0 flow with calendar.readonly scope
   - Web Push API with VAPID keys
   - Cloudflare KV storage patterns
   - Cloudflare Cron Trigger configuration

3. **Allowed APIs List**
   - Document exact method signatures to use
   - Note deprecated or non-existent methods to avoid

## Phase 1: Project Scaffold & Core Infrastructure

### Objective
Set up complete project structure with all configurations.

### Implementation Tasks
1. **Initialize Nuxt 3 Project**
   ```bash
   npx nuxi@latest init . --package-manager pnpm
   ```
   - Install dependencies: `@nuxthub/core` or `nitro` with CF preset
   - Add: `dexie`, `web-push`, `@vite-pwa/nuxt`, `open-props`, `poppins`, `lora`

2. **Configure Build System**
   - `nuxt.config.ts`: Cloudflare adapter, PWA plugin, Open-props
   - `wrangler.toml`: Pages + Workers + KV namespace + Cron trigger
   - `tsconfig.json`: strict mode, path aliases

3. **Design System Setup**
   - Create `/assets/css/tokens.css` with color palette from design-prompt.md:
     ```css
     --surface: #ffebe0;
     --surface-2: #FFCDB2;
     --accent: #E5989B;
     --text: #6D6875;
     ```
   - Import Poppins (headings) and Lora (body) fonts
   - Configure 8px spacing grid

4. **PWA Configuration**
   - Generate manifest.json with Sunlight branding
   - Create 192x192 and 512x512 icons (half-sun logo)
   - Configure service worker registration

5. **Environment Setup**
   - Generate VAPID key pair
   - Create `.env.example` with all 7 variables
   - Document in README

### Verification
- [ ] `pnpm dev` runs locally
- [ ] Deploys to Cloudflare Pages
- [ ] Lighthouse PWA score ≥ 90
- [ ] Design tokens applied correctly

## Phase 2: Data Layer & Authentication

### Objective
Implement secure data storage and Google OAuth flow.

### Implementation Tasks
1. **IndexedDB Layer (`/composables/useDB.ts`)**
   - Dexie schema for 6 tables (tokens, events, gaps, moments, engagements, prefs)
   - AES-GCM encryption for tokens table
   - Typed CRUD operations for each table
   - Unit tests for encryption and all operations

2. **Google OAuth Flow**
   - `/server/api/auth/google.ts`: Build OAuth URL, redirect
   - `/server/api/auth/google/callback.ts`: Exchange code, store in KV, issue JWT
   - `/composables/useAuth.ts`: Token management, refresh logic
   - Integration tests for full flow

3. **KV Storage Schema**
   - User records with exact schema from spec
   - Push subscription storage
   - Style preference persistence

### Verification
- [ ] OAuth flow completes end-to-end
- [ ] Tokens encrypted in IndexedDB
- [ ] Token refresh works automatically
- [ ] KV stores user data correctly

## Phase 3: Calendar Integration & Gap Detection

### Objective
Implement calendar sync and intelligent gap detection.

### Implementation Tasks
1. **Calendar API Client (`/composables/useCalendar.ts`)**
   - Fetch today + tomorrow events
   - Normalize to internal format
   - 15-minute cache in IndexedDB
   - Handle token refresh

2. **Gap Detection Algorithm (`/utils/detectGaps.ts`)**
   - Pure function implementing 5 rules from spec
   - Working hours detection
   - Backoff logic for dismissals
   - Comprehensive unit tests

3. **Content Selection Engine (`/utils/selectMoment.ts`)**
   - 6-factor scoring system
   - Week-based progressive unlocking
   - Style preference weighting

### Verification
- [ ] Calendar events fetch correctly
- [ ] Gap detection follows all 5 rules
- [ ] Content selection respects preferences
- [ ] All edge cases tested

## Phase 4: Push Infrastructure & Service Worker

### Objective
Enable background notifications and offline functionality.

### Implementation Tasks
1. **Push Infrastructure**
   - `/server/api/push/subscribe.ts`: Store subscription
   - `/server/api/push/unsubscribe.ts`: Remove subscription
   - `/server/cron/push-dispatch.ts`: 30-min cron trigger
   - `/composables/usePush.ts`: Client subscription

2. **Service Worker (`/public/sw.js`)**
   - Handle push events
   - Run gap detection on wake
   - Show notifications with moment content
   - Handle notification clicks/dismissals
   - Offline caching strategy

3. **Permission Flow**
   - Contextual permission prompt
   - 7-day backoff on denial
   - In-app prompt UI

### Verification
- [ ] Silent push wakes service worker
- [ ] Notifications show at right times
- [ ] Click opens moment screen
- [ ] Offline mode works

## Phase 5: UI Implementation

### Objective
Build all user-facing screens with design system.

### Implementation Tasks
1. **Onboarding Flow**
   - `/pages/onboarding/connect.vue`: Google Calendar connection
   - `/pages/onboarding/style.vue`: Style preference selection
   - `/pages/onboarding/done.vue`: Confirmation screen
   - `/middleware/onboarding.ts`: Route guard

2. **Core Screens**
   - `/pages/index.vue`: Ambient status view
   - `/pages/moment/[id].vue`: Micro-moment screen
   - `/pages/insight.vue`: Weekly insight

3. **Micro-moment Content**
   - `/content/moments.json`: 25-30 moments library
   - Both style variants for each
   - Progressive week-based unlocking

4. **Design Polish**
   - Warm color palette from design-prompt.md
   - Poppins/Lora typography
   - 8px spacing grid
   - Subtle animations (400ms ease-out)

### Verification
- [ ] All screens match design specs
- [ ] Responsive on mobile/desktop
- [ ] Accessibility compliant
- [ ] Smooth transitions

## Phase 6: Integration & Testing

### Objective
Complete end-to-end testing and production deployment.

### Implementation Tasks
1. **Integration Testing**
   - Full user journey tests
   - Push notification flow
   - Calendar sync verification
   - Offline mode testing

2. **Performance Optimization**
   - Lighthouse audit (PWA ≥ 90, Performance ≥ 85)
   - Bundle size optimization
   - Service worker caching strategy

3. **Production Deployment**
   - Configure all env vars in Cloudflare
   - Deploy to production domain
   - Verify cron triggers
   - Set up Cloudflare Web Analytics

### Verification
- [ ] All features work in production
- [ ] Push notifications deliver
- [ ] Cron triggers fire every 30 min
- [ ] Analytics tracking works

## Parallel Execution Strategy

### Agent Assignments

**Agent 1: Core Infrastructure**
- Phase 1: Project scaffold
- Phase 2: Data layer setup
- Deliverable: Running Nuxt app with IndexedDB

**Agent 2: Authentication & APIs**
- Phase 2: OAuth implementation
- Phase 3: Calendar integration
- Deliverable: Working Google auth + calendar sync

**Agent 3: Push & Service Worker**
- Phase 4: Push infrastructure
- Phase 4: Service worker
- Deliverable: Background notifications working

**Agent 4: UI/UX Implementation**
- Phase 5: All screens
- Phase 5: Design system
- Deliverable: Complete UI matching specs

**Agent 5: Quality Assurance**
- Phase 6: Testing suite
- Phase 6: Performance audit
- Deliverable: All tests passing, Lighthouse green

### Coordination Points
- After Phase 1: All agents sync on project structure
- After Phase 3: UI agent needs gap detection for testing
- After Phase 4: QA agent begins integration testing
- Phase 6: Final integration requires all agents complete

## Success Criteria

1. **Functional Requirements**
   - [ ] Google Calendar integration works
   - [ ] Notifications fire during gaps
   - [ ] All 5 gap detection rules implemented
   - [ ] 25-30 micro-moments available
   - [ ] Weekly insights generate

2. **Technical Requirements**
   - [ ] PWA installable
   - [ ] Offline capable
   - [ ] Tokens encrypted
   - [ ] No server-side behavior data
   - [ ] Lighthouse scores pass

3. **Design Requirements**
   - [ ] Matches design screenshots
   - [ ] Warm color palette applied
   - [ ] Typography hierarchy correct
   - [ ] Responsive layouts work
   - [ ] Accessibility compliant

## Risk Mitigation

1. **Push Notification Reliability**
   - Test across browsers
   - Handle permission denials gracefully
   - Implement retry logic

2. **Calendar API Rate Limits**
   - Implement caching
   - Batch requests when possible
   - Handle quota errors

3. **Service Worker Complexity**
   - Extensive logging
   - Version management
   - Clear cache strategy

## Notes

- Design system uses design-prompt.md palette (peach/mauve), not spec's yellow
- All behavioral data stays client-side in IndexedDB
- Server KV only stores identity and push subscription
- Service Worker runs all intelligence (gap detection, content selection)
- Silent push model: cron → push → SW wakes → detects → notifies