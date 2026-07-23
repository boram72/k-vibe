import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LocaleGuard } from './LocaleGuard'
import { AppLayout } from '@/blocks/layout/app-layout'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'
import LandingPage from '@/pages/LandingPage'
import MapPage from '@/pages/MapPage'
// import AnalyzePage from '@/pages/AnalyzePage'
import PersonaPage from '@/pages/PersonaPage'
import RoutePage from '@/pages/RoutePage'
import RadarPage from '@/pages/RadarPage'
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
          // { path: 'analyze', element: <AnalyzePage /> },
          { path: 'persona', element: <PersonaPage /> },
          { path: 'route', element: <RoutePage /> },
          { path: 'radar', element: <RadarPage /> },
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
