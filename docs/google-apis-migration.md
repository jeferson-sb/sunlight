# Google APIs Migration

This document describes the migration from hardcoded Google API fetch calls to using the specific `@googleapis/calendar` npm package with Better Auth integration.

## Overview

We've successfully migrated the calendar functionality from using direct fetch calls to `https://www.googleapis.com/calendar/v3/` to using the specific `@googleapis/calendar` package. This provides better type safety, error handling, and maintenance while keeping the bundle size smaller by only including the Calendar API instead of the entire Google APIs suite.

The integration leverages Better Auth for OAuth token management, eliminating the need for separate Google OAuth libraries.

## Changes Made

### 1. Server-Side API Endpoint

Created a new server endpoint at `/server/api/calendar/events.get.ts` that:
- Uses the specific `@googleapis/calendar` package (smaller bundle size)
- Integrates with Better Auth for token management
- Custom `GoogleAPIClient` bridges Better Auth tokens with Google APIs
- Provides proper error handling for different scenarios
- Supports query parameters for time ranges

### 2. Client-Side Composable Updates

Updated `app/composables/useCalendar.ts` to:
- Use the new server API endpoint via `$fetch`
- Remove direct token management (now handled server-side)
- Simplify error handling

### 3. Authentication Flow

The authentication flow now:
- Stores tokens securely in the Better Auth session
- Handles token refresh automatically server-side
- Uses the OAuth2 client from the `googleapis` package

## Benefits

1. **Smaller Bundle Size**: Using `@googleapis/calendar` instead of the full `googleapis` package
2. **Type Safety**: Full TypeScript definitions for the Calendar API
3. **Better Auth Integration**: Seamless integration with existing Better Auth setup
4. **Security**: Tokens managed by Better Auth, never exposed to client-side code
5. **Maintainability**: Using official Google library ensures compatibility
6. **Reusability**: `GoogleAPIClient` utility can be used for other Google APIs

## API Usage

### Server-Side

```typescript
import { calendar_v3 } from '@googleapis/calendar'
import { GoogleAPIClient } from '~/server/utils/google-api-client'
import { auth } from '~/server/utils/auth'

// Get session from Better Auth
const session = await auth.api.getSession({
  headers: getHeaders(event)
})

// Create Google API client with Better Auth tokens
const authClient = new GoogleAPIClient(
  session.session.accessToken,
  session.session.refreshToken
)

// Create calendar client
const calendarClient = new calendar_v3.Calendar({
  auth: authClient as any
})

// Fetch events
const response = await calendarClient.events.list({
  calendarId: 'primary',
  timeMin: startTime,
  timeMax: endTime,
  singleEvents: true,
  orderBy: 'startTime'
})
```

### Client-Side

```typescript
// Use the server API endpoint
const { data } = await $fetch('/api/calendar/events', {
  params: {
    timeMin: startOfToday.toISOString(),
    timeMax: endOfTomorrow.toISOString()
  }
})
```

## Environment Variables

The following environment variables are required:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Testing

Tests have been added to verify:
- Proper parameter formatting for the googleapis client
- OAuth2 credentials structure
- Event normalization from Google format to our format
- All-day event handling

Run tests with:
```bash
pnpm test test/unit/calendar-api.test.ts
```

## Future Improvements

1. Add support for other Google APIs by installing specific packages (e.g., `@googleapis/gmail`, `@googleapis/drive`)
2. Implement webhook support for real-time calendar updates
3. Add token refresh logic in the GoogleAPIClient when Better Auth refreshes tokens
4. Implement calendar event creation, updates, and deletion
5. Add caching layer for frequently accessed calendar data