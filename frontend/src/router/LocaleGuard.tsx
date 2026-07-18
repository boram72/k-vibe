import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import i18n, { SUPPORTED_LOCALES, type Locale } from '@/i18n'

const LOCALE_KEY = 'k-vibe-locale'

export function LocaleGuard() {
  const { locale } = useParams<{ locale: string }>()
  const isValid = SUPPORTED_LOCALES.includes(locale as Locale)

  useEffect(() => {
    if (isValid && locale) {
      i18n.changeLanguage(locale)
      localStorage.setItem(LOCALE_KEY, locale)
    }
  }, [locale, isValid])

  if (!isValid) {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null
    const fallback = saved && SUPPORTED_LOCALES.includes(saved) ? saved : 'en'
    return <Navigate to={`/${fallback}`} replace />
  }

  return <Outlet />
}
