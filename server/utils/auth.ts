import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

// Use SQLite for local development, will be replaced with D1 in production
const db = new Database('.data/auth.db')

// Create better-auth instance with SQLite for local dev
export const auth = betterAuth({
  database: db,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
      accessType: 'offline',
      prompt: 'consent'
    }
  },
  emailAndPassword: {
    enabled: false // We only use Google OAuth
  },
  advanced: {
    cookiePrefix: 'sunlight',
    generateId: () => crypto.randomUUID()
  }
})