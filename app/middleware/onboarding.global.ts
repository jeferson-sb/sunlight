export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/onboarding/connect') return

  // Only use cookies we control (not httpOnly) to avoid SSR/client mismatch
  const onboardingComplete = useCookie('onboarding_complete')
  const isOnboardingComplete = onboardingComplete.value === '1'

  // Onboarding routes: validate sequential progress
  if (to.path.startsWith('/onboarding')) {
    if (to.path === '/onboarding/done' && !isOnboardingComplete) {
      return navigateTo('/onboarding/style')
    }
    return
  }

  // Non-onboarding routes: require completed onboarding
  if (!isOnboardingComplete) {
    return navigateTo('/onboarding/connect')
  }
})
