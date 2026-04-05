import { authClient } from '~/lib/auth-client'

export const useAuth = () => {
  const session = authClient.useSession()

  const signInWithGoogle = async (): Promise<void> => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/onboarding/style'
    })
  }

  const signOut = async (): Promise<void> => {
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
