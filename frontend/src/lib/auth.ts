import { API_BASE_URL, apiClient } from '@/api/client'

export type AuthProvider = 'google' | 'kakao'

export interface AuthUser {
  id: string
  name: string
  email: string
  provider: AuthProvider | 'credentials'
}

const STORAGE_KEY = 'k-vibe-mock-session'

// Fixture per provider — stands in for what each real OAuth provider would
// actually return, so swapping in real auth later doesn't change what the UI
// expects to receive (still "an AuthUser shaped by which provider was used").
const MOCK_USERS: Record<AuthProvider, AuthUser> = {
  google: { id: 'mock-google-1', name: 'Google User', email: 'guest@gmail.com', provider: 'google' },
  kakao: { id: 'mock-kakao-1', name: '카카오 사용자', email: 'guest@kakao.com', provider: 'kakao' },
}

// All three functions below are mocked against localStorage for now. Step15
// (backend integration) replaces only these bodies — e.g. with
// supabase.auth.getUser()/signInWithOAuth()/signOut(), or calls to our own
// backend — without touching any caller (LoginModal/ProfilePage/TopBar only
// ever go through useAuth(), never these functions directly).
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

// See OAUTH_INTEGRATION_REQUEST.md — backend relays the OAuth flow (frontend
// never talks to Google/Kakao directly). This callback path must match the
// route registered in router/index.tsx.
const OAUTH_CALLBACK_PATH = '/auth/callback'

function buildOAuthStartUrl(provider: AuthProvider): string {
  const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`
  return `${API_BASE_URL}/auth/${provider}/start?redirect_uri=${encodeURIComponent(redirectUri)}`
}

// No usable API_BASE_URL -> keep working as an instant mock login, same as
// every other mock-fallback in this codebase. Once there is one (dev's
// /backend proxy or a real VITE_API_BASE_URL), this navigates the whole page
// to the backend's OAuth start endpoint instead — the promise below never
// resolves because the page is leaving; the actual login completes on the
// /auth/callback route (see completeOAuthLogin).
export async function loginWithProvider(provider: AuthProvider): Promise<AuthUser> {
  if (!API_BASE_URL) {
    const user = MOCK_USERS[provider]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  }
  window.location.href = buildOAuthStartUrl(provider)
  return new Promise(() => {})
}

// Called by the /auth/callback route once the backend redirects back with
// the logged-in identity in the query string.
export function completeOAuthLogin(data: { username: string; email: string; provider: AuthProvider }): AuthUser {
  return toAuthUser({ username: data.username, email: data.email }, data.provider)
}

export async function logout(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
}

// ID/PW 하이브리드 로그인 — OAuth와 달리 mock이 아니라 실제 backend(user.py)를
// 호출한다. frontend→backend→Supabase DB 저장까지 실제로 확인하려는 용도.
export interface SignupPayload {
  username: string
  nationality: string
  email: string
  password: string
}

function toAuthUser(data: { username: string; email: string }, provider: AuthUser['provider'] = 'credentials'): AuthUser {
  const user: AuthUser = { id: data.username, name: data.username, email: data.email, provider }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

export async function signupWithCredentials(payload: SignupPayload): Promise<AuthUser> {
  const { data } = await apiClient.post('/user/signup', payload)
  return toAuthUser(data)
}

export async function loginWithCredentials(username: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post('/user/login', { username, password })
  return toAuthUser(data)
}
