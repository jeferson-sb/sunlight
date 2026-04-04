import { authClient } from '~/lib/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  // /onboarding/connect is always accessible (no auth or prefs needed)
  if (to.path === '/onboarding/connect') return

  // Use a cookie to track onboarding completion (works on both SSR and client)
  const onboardingComplete = useCookie('onboarding_complete')

  // SSR-compatible session check using useFetch
  const { data: session } = await authClient.useSession(useFetch)

  // Onboarding routes: validate sequential progress
  if (to.path.startsWith('/onboarding')) {
    if (to.path === '/onboarding/style') {
      if (!session.value) return navigateTo('/onboarding/connect')
      return
    }

    if (to.path === '/onboarding/done') {
      if (!session.value) return navigateTo('/onboarding/connect')
      // Can only check prefs on client side (IndexedDB)
      if (import.meta.client) {
        const { prefs } = useDB()
        const userPrefs = await prefs.get()
        if (!userPrefs.style) return navigateTo('/onboarding/style')
      }
      return
    }

    return
  }

  // Non-onboarding routes: redirect to onboarding if not completed
  if (import.meta.server) {
    // On SSR, use cookie as proxy for onboarding completion
    if (!onboardingComplete.value) {
      return navigateTo('/onboarding/connect')
    }
    return
  }

  // On client, check IndexedDB prefs
  const { prefs } = useDB()
  const userPrefs = await prefs.get()
  if (!userPrefs.style) {
    onboardingComplete.value = null
    return navigateTo('/onboarding/connect')
  }

  // Sync cookie with prefs state
  if (!onboardingComplete.value) {
    onboardingComplete.value = '1'
  }
})
