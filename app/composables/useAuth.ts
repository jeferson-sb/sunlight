import { authClient } from '~/lib/auth-client'

export const useAuth = () => {
  const session = authClient.useSession()

  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/onboarding/style'
    })
  }

  const signOut = async () => {
    await authClient.signOut()
  }

  const isAuthenticated = computed(() => !!session.value?.data)

  return {
    session,
    isAuthenticated,
    signInWithGoogle,
    signOut
  }
}
