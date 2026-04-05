import { betterAuth } from 'better-auth'
import type { Auth } from 'better-auth'

let _auth: Auth | null = null

const getAuthConfig = () => ({
  database: hubDatabase(),
  baseURL: useRuntimeConfig().betterAuthUrl,
  trustedOrigins: [useRuntimeConfig().app.baseURL],
  socialProviders: {
    google: {
      clientId: useRuntimeConfig().googleClientId || '',
      clientSecret: useRuntimeConfig().googleClientSecret || '',
      redirectURI: useRuntimeConfig().googleRedirectUri,
      scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
      accessType: 'offline',
      prompt: 'consent'
    }
  },
  emailAndPassword: {
    enabled: false
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  callbacks: {
    session: async ({ session, user }) => {
      // Store tokens in session for googleapis usage
      return {
        ...session,
        // Access token and refresh token are handled by better-auth
        // They are accessible via session.accessToken and session.refreshToken
      }
    }
  },
  advanced: {
    cookiePrefix: 'sunlight',
    generateId: () => crypto.randomUUID(),
    crossSubDomainCookies: {
      enabled: false
    }
  }
})

export const getAuth = (): Auth => {
  if (!_auth) {
    _auth = betterAuth(getAuthConfig())
  }
  return _auth
}

// Keep named export for backward compatibility
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return getAuth()[prop as keyof Auth]
  }
})
