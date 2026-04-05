/**
 * Onboarding global middleware tests
 *
 * The middleware uses Nuxt auto-imports (defineNuxtRouteMiddleware, useCookie,
 * navigateTo) which are not available in the plain Node unit test environment.
 * We stub them before importing the middleware module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Shared state for cookie value and navigateTo spy
// ---------------------------------------------------------------------------

let cookieValue: string | null = null
const navigateTo = vi.fn((path: string) => path)

// ---------------------------------------------------------------------------
// Stub Nuxt globals BEFORE importing the middleware
// ---------------------------------------------------------------------------

vi.stubGlobal('defineNuxtRouteMiddleware', (handler: (to: { path: string }) => unknown) => handler)
vi.stubGlobal('useCookie', (_name: string) => ({
  get value() { return cookieValue },
}))
vi.stubGlobal('navigateTo', navigateTo)

// ---------------------------------------------------------------------------
// Import the middleware (it executes defineNuxtRouteMiddleware and returns the handler)
// ---------------------------------------------------------------------------

// We do a dynamic import inside each test so that the stubs are in place.
// But because Vitest caches modules, we reset modules and re-import each time.

type RouteMiddlewareHandler = (to: { path: string }) => unknown

const loadMiddleware = async (): Promise<RouteMiddlewareHandler> => {
  vi.resetModules()
  const mod = await import('../../app/middleware/onboarding.global')
  // The default export is the middleware handler
  return mod.default as RouteMiddlewareHandler
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('onboarding.global middleware', () => {
  beforeEach(() => {
    navigateTo.mockClear()
    cookieValue = null
  })

  describe('when visiting /onboarding/connect', () => {
    it('always allows access regardless of onboarding state', async () => {
      const middleware = await loadMiddleware()
      cookieValue = null // not completed

      const result = middleware({ path: '/onboarding/connect' })

      // The middleware returns early (undefined) without calling navigateTo
      expect(result).toBeUndefined()
      expect(navigateTo).not.toHaveBeenCalled()
    })
  })

  describe('when onboarding is NOT complete', () => {
    beforeEach(() => {
      cookieValue = null
    })

    it('redirects non-onboarding routes to /onboarding/connect', async () => {
      const middleware = await loadMiddleware()

      middleware({ path: '/' })

      expect(navigateTo).toHaveBeenCalledWith('/onboarding/connect')
    })

    it('redirects /onboarding/done to /onboarding/style', async () => {
      const middleware = await loadMiddleware()

      middleware({ path: '/onboarding/done' })

      expect(navigateTo).toHaveBeenCalledWith('/onboarding/style')
    })

    it('allows access to /onboarding/style without redirect', async () => {
      const middleware = await loadMiddleware()

      const result = middleware({ path: '/onboarding/style' })

      // Returns early from the onboarding branch — no navigateTo
      expect(navigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('does not redirect pages inside /onboarding other than /done', async () => {
      const middleware = await loadMiddleware()

      middleware({ path: '/onboarding/style' })
      middleware({ path: '/onboarding/connect' })

      expect(navigateTo).not.toHaveBeenCalled()
    })
  })

  describe('when onboarding IS complete (cookie = "1")', () => {
    beforeEach(() => {
      cookieValue = '1'
    })

    it('allows access to the main app without redirect', async () => {
      const middleware = await loadMiddleware()

      const result = middleware({ path: '/' })

      expect(navigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access to /onboarding/done', async () => {
      const middleware = await loadMiddleware()

      const result = middleware({ path: '/onboarding/done' })

      // With complete onboarding, /done check evaluates to false — falls through
      expect(navigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access to any protected route', async () => {
      const middleware = await loadMiddleware()

      middleware({ path: '/moment/abc-123' })

      expect(navigateTo).not.toHaveBeenCalled()
    })
  })

  describe('when cookie has a value other than "1"', () => {
    it('treats the cookie as incomplete and redirects to /onboarding/connect', async () => {
      cookieValue = '0'
      const middleware = await loadMiddleware()

      middleware({ path: '/dashboard' })

      expect(navigateTo).toHaveBeenCalledWith('/onboarding/connect')
    })
  })
})
