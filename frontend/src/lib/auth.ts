import { API_BASE_URL, apiClient } from '@/api/client'

export type AuthProvider = 'google'

export interface AuthUser {
  id: string
  name: string
  email: string
  provider: AuthProvider | 'credentials'
}

const STORAGE_KEY = 'k-vibe-mock-session'

// getCurrentUser/logout below only read/clear this local session record —
// there's no server-issued token or session validation yet, just "who last
// completed a login flow on this browser" (real OAuth identity via
// completeOAuthLogin, or real credentials via toAuthUser). Step15 replaces
// these bodies with real session handling without touching any caller
// (LoginModal/ProfilePage/TopBar only ever go through useAuth()).
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

// See OAUTH_INTEGRATION_REQUEST.md — backend relays the OAuth flow (frontend
// never talks to Google directly). This callback path must match the
// route registered in router/index.tsx.
const OAUTH_CALLBACK_PATH = '/auth/callback'

function buildOAuthStartUrl(provider: AuthProvider): string {
  const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`
  return `${API_BASE_URL}/auth/${provider}/start?redirect_uri=${encodeURIComponent(redirectUri)}`
}

// 2026-09: mock 로그인(구 loginWithProvider/MOCK_USERS/isOAuthBackendConfigured)
// 제거 — LoginModal의 Google 버튼은 이제 항상 이 함수로 실제 리다이렉트를
// 시도한다. 백엔드에 /auth/{provider}/start|callback 라우트가 아직 없어서
// (OAUTH_INTEGRATION_REQUEST.md 참고) 그 전까지는 클릭 시 404로 실패하는 게
// 사용자에게 그대로 보임 — 조용한 mock 폴백 대신 실패를 드러내기로 한 결정.
// completeOAuthLogin/OAuthCallbackPage는 백엔드 라우트가 준비되는 대로 바로
// 동작하도록 이미 구현되어 있음.
// 2026-09 팀 태스크보드: 카카오 로그인 삭제 — AuthProvider를 'google'로만
// 좁혔다. 백엔드(oauthService.py)의 카카오 지원 코드는 그대로 남아있어서
// 필요해지면 이 타입에 'kakao'만 다시 추가하고 login-modal.tsx의
// PROVIDER_BUTTONS에 항목만 되돌리면 됨(그 외 로직 변경 불필요).
export function redirectToOAuthProvider(provider: AuthProvider): void {
  window.location.href = buildOAuthStartUrl(provider)
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
