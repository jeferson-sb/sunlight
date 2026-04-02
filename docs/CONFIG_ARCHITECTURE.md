# Configuration Architecture

## Overview

The Sunlight app uses a two-layer configuration system for managing environment variables:

1. **Build-time configuration** (`nuxt.config.ts`)
2. **Runtime configuration** (`app/lib/config.ts`)

## Configuration Flow

```
.env file / Environment Variables
            ↓
    nuxt.config.ts (build-time)
      - Reads process.env
      - Populates runtimeConfig
            ↓
    app/lib/config.ts (runtime)
      - Reads from useRuntimeConfig()
      - Provides type-safe access
      - Validates with Zod schemas
            ↓
    Application Components
```

## Build-Time Configuration (`nuxt.config.ts`)

The `nuxt.config.ts` file contains an `envConfig` object that:
- Reads environment variables at build time
- Provides defaults for development
- Passes values to Nuxt's `runtimeConfig`

```typescript
const envConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    // ...
  }
}
```

## Runtime Configuration (`app/lib/config.ts`)

The centralized config module:
- Reads from Nuxt's `runtimeConfig`
- Validates configuration with Zod schemas
- Provides type-safe access throughout the app
- Handles client/server context differences

### Key Features:

- **Type Safety**: Full TypeScript types via Zod inference
- **Validation**: Automatic validation with helpful error messages
- **Context Aware**: Different schemas for client vs server
- **Development Friendly**: Optional fields with defaults in dev
- **Production Safe**: Strict validation in production

### Usage:

```typescript
import { config, getConfig, googleConfig } from '~/lib/config'

// Direct access (lazy-loaded singleton)
console.log(config.appUrl)

// Get specific config section
const google = googleConfig()

// Get fresh config with validation
const cfg = getConfig()
```

## Environment Variables

Set these in your `.env` file (copy from `.env.example`):

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `VAPID_PUBLIC_KEY` - Web Push public key
- `VAPID_PRIVATE_KEY` - Web Push private key
- `VAPID_EMAIL` - Contact email for push service
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `GEMINI_API_KEY` - Google Gemini API key (optional)
- `PUBLIC_APP_URL` - Public URL of the app

## Validation Rules

### Development Mode:
- Most fields are optional with sensible defaults
- Warnings are logged for missing configuration

### Production Mode:
- All OAuth fields are required
- JWT secret must be changed from default
- VAPID keys are required for push notifications
- Invalid configuration prevents app startup