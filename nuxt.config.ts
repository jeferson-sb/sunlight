const envConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  },
  vapid: {
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    email: process.env.VAPID_EMAIL || 'mailto:admin@sunlight.app'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || ''
  },
  app: {
    url: process.env.PUBLIC_APP_URL || 'http://localhost:3000'
  }
} as const

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  routeRules: {
    '/onboarding': { redirect: '/onboarding/connect' }
  },

  modules: ['@nuxthub/core', '@vite-pwa/nuxt', '@nuxt/content', '@nuxt/test-utils', '@vueuse/nuxt'],

  nitro: {
    preset: 'cloudflare-pages',
    compatibilityFlags: ['nodejs_compat'],
    experimental: {
      wasm: true
    }
  },

  hub: {
    database: true,
    kv: true
  },

  pwa: {
    strategies: 'injectManifest',
    srcDir: 'app',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Sunlight',
      short_name: 'Sunlight',
      description: 'Micro-wellness moments for your workday',
      theme_color: '#FFCDB2',
      background_color: '#ffebe0',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}']
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  },

  css: [
    'open-props/style',
    '~/assets/css/tokens.css',
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    // Private keys (server-side only)
    googleClientId: envConfig.google.clientId,
    googleClientSecret: envConfig.google.clientSecret,
    googleRedirectUri: envConfig.google.redirectUri,
    vapidPrivateKey: envConfig.vapid.privateKey,
    vapidEmail: envConfig.vapid.email,
    jwtSecret: envConfig.jwt.secret,
    geminiApiKey: envConfig.gemini.apiKey,

    // Public keys (available on both client and server)
    public: {
      vapidPublicKey: envConfig.vapid.publicKey,
      appUrl: envConfig.app.url
    }
  }
})
