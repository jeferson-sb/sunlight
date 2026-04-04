import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  baseURL: import.meta.dev ? 'http://localhost:3000' : undefined
})
