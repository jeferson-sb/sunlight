export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware for onboarding routes themselves
  if (to.path.startsWith('/onboarding')) {
    return
  }

  // Check if user has completed onboarding
  const { prefs } = useDB()
  const userPrefs = await prefs.get()

  // If no style preference is set, user hasn't completed onboarding
  if (!userPrefs.style) {
    return navigateTo('/onboarding/connect')
  }
})