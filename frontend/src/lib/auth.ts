import { API_BASE_URL, apiClient } from '@/api/client'
import { clearPersonaRoutePlan, flushRouteDraftSync, saveRouteDraft } from '@/lib/route-draft'
import { useRouteProgressStore } from '@/store/route-progress-store'

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

// 2026-09 QA 11번 — 로그아웃해도 "내 루트"(k-vibe-current-route 등)가 그대로
// 남아 다음 사람(게스트 포함, 같은 브라우저)이 이전 계정의 루트를 그대로
// 보던 버그. saved-places.ts처럼 계정별 버킷을 새로 만들기보다, 로그아웃
// 시점에 화면(로컬)만 게스트 상태로 비우는 쪽으로 확정 — 계정 데이터 자체는
// 서버(route-draft 테이블)에 남아있다가 다음 로그인 때 복원된다
// (route-draft.ts의 restoreRouteDraftFromServer 참고).
//
// 후속 발견·수정 — 로그아웃 버튼을 누른 시점에 아직 서버로 안 나간 편집(드래그
// 재정렬 등, 디바운스 대기 중)이 있으면 세션을 먼저 지워버려서 그 편집이
// 영영 서버에 반영되지 못하고 로컬도 비워지는 버그가 있었음(디바운스 타이머가
// 나중에 실행돼도 이미 로그아웃된 상태라 getCurrentUser()가 null이라 조용히
// 무시됨) — 세션을 지우기 전에 대기 중인 동기화를 먼저 flush로 보내고 나서
// 로컬을 비우도록 순서 변경.
export async function logout(): Promise<void> {
  await flushRouteDraftSync()
  localStorage.removeItem(STORAGE_KEY)
  saveRouteDraft([])
  clearPersonaRoutePlan()
  useRouteProgressStore.getState().clear()
}

// ID/PW 하이브리드 로그인 — OAuth와 달리 mock이 아니라 실제 backend(user.py)를
// 호출한다. frontend→backend→Supabase DB 저장까지 실제로 확인하려는 용도.
export interface SignupPayload {
  username: string
  nationality: string
  email: string
  password: string
}

function toAuthUser(
  data: { username: string; email: string; display_name?: string },
  provider: AuthUser['provider'] = 'credentials',
): AuthUser {
  const user: AuthUser = { id: data.username, name: data.display_name || data.username, email: data.email, provider }
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

// 표시 이름 편집 — BACKEND_REQUESTS.md #1의 POST /user/display-name이 아직 없어
// 그 전까진 404. username(id)은 안 바뀌고 화면에 보이는 name만 바뀜.
export async function updateDisplayName(user: AuthUser, displayName: string): Promise<AuthUser> {
  const { data } = await apiClient.post('/user/display-name', { username: user.id, display_name: displayName })
  return toAuthUser(data, user.provider)
}
