export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
    '@vite-pwa/nuxt',
    '@nuxt/content',
    '@nuxt/test-utils',
  ],

  nitro: {
    preset: 'cloudflare-pages',
    experimental: {
      wasm: true
    }
  },

  hub: {
    kv: true
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Sunlight',
      short_name: 'Sunlight',
      theme_color: '#FFCDB2',
      background_color: '#ffebe0',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: true,
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
    // Private keys - only available server-side
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@sunlight.app',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    geminiApiKey: process.env.GEMINI_API_KEY || '',

    // Public keys - available client-side
    public: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      appUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000'
    }
  }
})
