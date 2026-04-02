import { z } from 'zod'

/**
 * Centralized configuration for the Sunlight app
 * All runtime environment variables are accessed through this module
 * Uses Zod for runtime validation and type safety
 */

// Environment schema
const EnvironmentSchema = z.enum(['development', 'production', 'test'])
type Environment = z.infer<typeof EnvironmentSchema>

// Public configuration schema (available on both client and server)
const PublicConfigSchema = z.object({
  appUrl: z.url().default('http://localhost:3000'),
  vapidPublicKey: z.string().default(''),
  environment: EnvironmentSchema.default('development'),
  isProduction: z.boolean(),
  isDevelopment: z.boolean(),
  isTest: z.boolean(),
  isCI: z.boolean()
})

// Private configuration schema (only available on server)
// In development, fields are optional with defaults
const PrivateConfigSchema = z.object({
  google: z.object({
    clientId: z.string().default(''),
    clientSecret: z.string().default(''),
    redirectUri: z.string().default('http://localhost:3000/api/auth/google/callback')
  }),
  vapid: z.object({
    privateKey: z.string().default(''),
    email: z.string().default('mailto:admin@sunlight.app')
  }),
  jwt: z.object({
    secret: z.string()
      .default('dev-secret-change-in-production')
      .refine(
        (val) => {
          // Only validate in production environment
          if (import.meta.server) {
            const env = (process.env.NODE_ENV || 'development')
            if (env === 'production') {
              // In production, require a proper secret
              return val.length >= 32 && val !== 'dev-secret-change-in-production'
            }
          }
          return true
        },
        'JWT_SECRET must be at least 32 characters and changed for production'
      )
  }),
  gemini: z.object({
    apiKey: z.string().optional().default('')
  })
})

// Combined schema for server-side config
const ServerConfigSchema = PublicConfigSchema.merge(PrivateConfigSchema)

// Client-side config schema (private fields are optional/empty)
const ClientConfigSchema = PublicConfigSchema.extend({
  google: z.object({
    clientId: z.string().default(''),
    clientSecret: z.string().default(''),
    redirectUri: z.string().default('')
  }),
  vapid: z.object({
    privateKey: z.string().default(''),
    email: z.string().default('')
  }),
  jwt: z.object({
    secret: z.string().default('')
  }),
  gemini: z.object({
    apiKey: z.string().optional().default('')
  })
})

// Export types
export type PublicConfig = z.infer<typeof PublicConfigSchema>
export type PrivateConfig = z.infer<typeof PrivateConfigSchema>
export type ServerConfig = z.infer<typeof ServerConfigSchema>
export type ClientConfig = z.infer<typeof ClientConfigSchema>
export type Config = ServerConfig | ClientConfig

// Helper to detect environment
const getEnvironment = (): {
  environment: Environment
  isProduction: boolean
  isDevelopment: boolean
  isTest: boolean
  isCI: boolean
} => {
  const env = (import.meta.server ? process.env.NODE_ENV : 'development') as Environment
  return {
    environment: env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isCI: import.meta.server ? !!process.env.CI : false
  }
}

// Get raw config data
const getRawConfig = () => {
  const env = getEnvironment()

  if (import.meta.client) {
    // Client-side: use public runtime config only
    const runtimeConfig = useRuntimeConfig()
    return {
      // Public config
      appUrl: runtimeConfig.public.appUrl,
      vapidPublicKey: runtimeConfig.public.vapidPublicKey,
      ...env,

      // Private config (empty on client)
      google: {
        clientId: '',
        clientSecret: '',
        redirectUri: ''
      },
      vapid: {
        privateKey: '',
        email: ''
      },
      jwt: {
        secret: ''
      },
      gemini: {
        apiKey: ''
      }
    }
  }

  // Server-side: use full runtime config
  const runtimeConfig = useRuntimeConfig()
  return {
    // Public config
    appUrl: runtimeConfig.public.appUrl || 'http://localhost:3000',
    vapidPublicKey: runtimeConfig.public.vapidPublicKey || '',
    ...env,

    // Private config
    google: {
      clientId: runtimeConfig.googleClientId || '',
      clientSecret: runtimeConfig.googleClientSecret || '',
      redirectUri: runtimeConfig.googleRedirectUri || 'http://localhost:3000/api/auth/google/callback'
    },
    vapid: {
      privateKey: runtimeConfig.vapidPrivateKey || '',
      email: runtimeConfig.vapidEmail || 'mailto:admin@sunlight.app'
    },
    jwt: {
      secret: runtimeConfig.jwtSecret || 'dev-secret-change-in-production'
    },
    gemini: {
      apiKey: runtimeConfig.geminiApiKey || ''
    }
  }
}

// Validate and parse configuration
export const getConfig = (): Config => {
  const raw = getRawConfig()
  const schema = import.meta.client ? ClientConfigSchema : ServerConfigSchema

  try {
    return schema.parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const env = getEnvironment()
      console.error('Configuration validation failed:')
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`)
        })
      } else {
        console.error('  - Invalid configuration structure')
      }

      // In production, throw error to prevent startup with invalid config
      if (env.isProduction) {
        throw new Error('Invalid configuration for production environment')
      }

      // In development, return partial config with defaults
      console.warn('Using default values for missing configuration')
      const safeResult = schema.safeParse(raw)
      if (safeResult.success) {
        return safeResult.data
      }
      // Return raw config as fallback (with type assertion)
      return raw as Config
    }
    throw error
  }
}

// Export singleton config instance (lazy-loaded)
let _config: Config | null = null
export const config = new Proxy({} as Config, {
  get(target, prop) {
    if (!_config) {
      _config = getConfig()
    }
    return _config[prop as keyof Config]
  }
})

// Safe config getter with validation result
export const getSafeConfig = () => {
  const raw = getRawConfig()
  const schema = import.meta.client ? ClientConfigSchema : ServerConfigSchema
  return schema.safeParse(raw)
}

// URL helpers
export const getAuthCallbackUrl = (provider: string = 'google'): string => {
  const cfg = getConfig()
  return `${cfg.appUrl}/api/auth/${provider}/callback`
}

export const getApiUrl = (path: string): string => {
  const cfg = getConfig()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cfg.appUrl}/api${cleanPath}`
}

// Auth client configuration helper
export const getAuthClientConfig = () => {
  const cfg = getConfig()
  return {
    baseURL: cfg.isProduction ? 'https://sunlight.app' : cfg.appUrl
  }
}

// Config section getters for convenience
export const googleConfig = () => getConfig().google
export const vapidConfig = () => getConfig().vapid
export const jwtConfig = () => getConfig().jwt
export const geminiConfig = () => getConfig().gemini

// Environment helpers
export const isProduction = () => getConfig().isProduction
export const isDevelopment = () => getConfig().isDevelopment
export const isTest = () => getConfig().isTest
export const isCI = () => getConfig().isCI
