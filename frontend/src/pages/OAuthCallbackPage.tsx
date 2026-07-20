import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { completeOAuthLogin, type AuthProvider } from '@/lib/auth'
import { mergeGuestSavedPlacesIntoUser } from '@/lib/saved-places'

const AUTH_QUERY_KEY = ['auth-user']
const SAVED_PLACES_QUERY_KEY = ['saved-places']

// Landing spot for the backend's OAuth redirect (see OAUTH_INTEGRATION_REQUEST.md)
// — it sends the user back here with either ?username&email&provider on
// success or ?error on failure. This mirrors what useAuth()'s loginMutation
// normally does on success (merge guest saves, invalidate queries), since
// that mutation never resolves for the real redirect path.
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const handledRef = useRef(false)

  useEffect(() => {
    // StrictMode double-invokes effects in dev — guard so login isn't processed twice.
    if (handledRef.current) return
    handledRef.current = true

    const error = searchParams.get('error')
    const username = searchParams.get('username')
    const email = searchParams.get('email')
    const provider = searchParams.get('provider') as AuthProvider | null

    if (error || !username || !email || !provider) {
      toast.error(t('login.oauth_failed'))
      navigate('/', { replace: true })
      return
    }

    const user = completeOAuthLogin({ username, email, provider })
    mergeGuestSavedPlacesIntoUser(user.id).finally(() => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SAVED_PLACES_QUERY_KEY })
      navigate('/', { replace: true })
    })
  }, [searchParams, navigate, queryClient, t])

  return null
}
