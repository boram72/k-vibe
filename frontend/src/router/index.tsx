import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LocaleGuard } from './LocaleGuard'
import { AppLayout } from '@/blocks/layout/app-layout'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'
import LandingPage from '@/pages/LandingPage'
import MapPage from '@/pages/MapPage'
import AnalyzePage from '@/pages/AnalyzePage'
import PersonaPage from '@/pages/PersonaPage'
import RoutePage from '@/pages/RoutePage'
import ProfilePage from '@/pages/ProfilePage'
import OAuthCallbackPage from '@/pages/OAuthCallbackPage'

const LOCALE_KEY = 'k-vibe-locale'

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved

  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) return browserLang as Locale

  return 'en'
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={`/${detectLocale()}`} replace />,
  },
  {
    path: '/:locale',
    element: <LocaleGuard />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        element: <AppLayout />,
        children: [
          { path: 'map', element: <MapPage /> },
          { path: 'analyze', element: <AnalyzePage /> },
          { path: 'persona', element: <PersonaPage /> },
          { path: 'route', element: <RoutePage /> },
          // 대화 중 요청(2026-09-20) — RadarPage는 이미 내비게이션 메뉴에서
          // 숨겨져 있었지만(CLAUDE.md, 정확도/컨셉 불일치 사유) 라우터엔 계속
          // 등록돼 있어서 URL을 직접 알면 여전히 들어갈 수 있었음. Radar가
          // 실측 GPS 원본 좌표를 그대로 백엔드로 보내는(관할구역 우회 로직
          // 미적용) 게 발견돼서, 그 경로 자체를 막기 위해 라우트 등록만
          // 제거 — 페이지/컴포넌트/로직은 전부 그대로 보존(컨셉이 되돌아오면
          // 이 줄만 복구하면 됨).
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    // Backend's OAuth redirect target (see OAUTH_INTEGRATION_REQUEST.md) —
    // locale-agnostic on purpose so lib/auth.ts's redirect_uri doesn't need
    // to know the user's locale before login has even completed.
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
