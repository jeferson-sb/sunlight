import { createAuthClient } from 'better-auth/client'

// Create the auth client
const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://sunlight.app' // Update with your production URL
    : 'http://localhost:3000'
})

export const useAuth = () => {
  const user = ref(authClient.user)
  const session = ref(authClient.session)

  // Sign in with Google
  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/'
    })
  }

  // Sign out
  const signOut = async () => {
    await authClient.signOut()
  }

  // Get current session
  const getSession = async () => {
    const sessionData = await authClient.getSession()
    session.value = sessionData
    return sessionData
  }

  // Check if user is authenticated
  const isAuthenticated = computed(() => !!session.value)

  // Get access token for Google APIs
  const getGoogleAccessToken = async () => {
    const sessionData = await getSession()
    // The Google access token is stored in the session's account data
    if (sessionData?.account?.access_token) {
      return sessionData.account.access_token
    }
    return null
  }

  // Refresh token if needed
  const refreshGoogleToken = async () => {
    const sessionData = await getSession()
    if (sessionData?.account?.refresh_token) {
      // Better-auth handles token refresh automatically
      // when making requests through the client
      return authClient.refreshSession()
    }
    return null
  }

  return {
    user,
    session,
    isAuthenticated,
    signInWithGoogle,
    signOut,
    getSession,
    getGoogleAccessToken,
    refreshGoogleToken
  }
}