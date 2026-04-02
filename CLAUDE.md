## What

### Tech Stack

- **Language**: TypeScript
- **Framework**: Nuxt 4 (Fullstack)
- **Testing**: Vitest, Playwright
- **Authentication**: Better Auth
- **Database**: Dexie (IndexedDB)
- **PWA**: @vite-pwa/nuxt
- **Push Notifications**: web-push
- **Deployment**: Cloudflare Pages

## Why

Seek code conventions, design specs, and architecture documentation in the `docs/` directory.

[Code Conventions](./docs/code_conventions.md)
[Design specs](./docs/design/)
[Architecture](./docs/architecture.md)

## How

Package Manager: pnpm
JavaScript Runtime: Node

### Environment Variables

Copy the contents of each `.env.example` file to a new `.env` file in the same directory and fill in the required values.

### Setup

Make sure to install dependencies:

```bash
pnpm install
```

### Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm run dev
```

### Production

Build the application for production:

```bash
pnpm build

```

Locally preview production build:

```bash
pnpm run preview
```

### Testing

```bash
pnpm run test
```

### Linting/Formatting

```bash
pnpm run lint
pnpm run format
```
