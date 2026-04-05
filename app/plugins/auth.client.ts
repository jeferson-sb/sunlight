import { authClient } from '~/lib/auth-client'

export default defineNuxtPlugin(async () => {
  // Initialize session on client mount
  await authClient.getSession()
})