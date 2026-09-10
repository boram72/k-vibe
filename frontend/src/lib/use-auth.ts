import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCurrentUser,
  loginWithCredentials,
  logout,
  signupWithCredentials,
  type SignupPayload,
} from '@/lib/auth'
import { mergeGuestSavedPlacesIntoUser } from '@/lib/saved-places'

const AUTH_QUERY_KEY = ['auth-user']
const SAVED_PLACES_QUERY_KEY = ['saved-places']

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user = null, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
  })

  // OAuth login (Google) no longer goes through a mutation here — it's
  // a full-page redirect (see auth.ts's redirectToOAuthProvider) that never
  // "resolves" on this page. The equivalent of this mutation's onSuccess
  // (merge guest saves, invalidate queries) runs in OAuthCallbackPage once
  // the backend redirects back with the logged-in identity.
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SAVED_PLACES_QUERY_KEY })
    },
  })

  const onCredentialsSuccess = async (loggedInUser: { id: string }) => {
    await mergeGuestSavedPlacesIntoUser(loggedInUser.id)
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: SAVED_PLACES_QUERY_KEY })
  }

  const signupMutation = useMutation({
    mutationFn: (payload: SignupPayload) => signupWithCredentials(payload),
    onSuccess: onCredentialsSuccess,
  })

  const loginCredentialsMutation = useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      loginWithCredentials(payload.username, payload.password),
    onSuccess: onCredentialsSuccess,
  })

  return {
    user,
    isLoading,
    logout: logoutMutation.mutate,
    signup: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
    signupError: signupMutation.error,
    loginWithCredentials: loginCredentialsMutation.mutate,
    isLoggingInWithCredentials: loginCredentialsMutation.isPending,
    loginCredentialsError: loginCredentialsMutation.error,
  }
}
