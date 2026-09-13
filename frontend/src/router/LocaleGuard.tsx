import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import i18n, { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { AnalysisCompletionBanner } from '@/blocks/analyze/analysis-completion-banner'

export function LocaleGuard() {
  const { locale } = useParams<{ locale: string }>()
  const isValid = SUPPORTED_LOCALES.includes(locale as Locale)

  // i18n/index.ts already reads this same URL segment synchronously at init
  // time, so by the time this effect runs i18n.language usually already
  // matches `locale` — this call is then a no-op (no re-render, no refetch).
  // It still needs to run for the one path that init-time detection can't
  // cover: navigating between locale segments client-side (e.g. the language
  // dropdown) without a full page reload.
  useEffect(() => {
    if (isValid && locale) {
      i18n.changeLanguage(locale)
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    }
  }, [locale, isValid])

  if (!isValid) {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    const fallback = saved && SUPPORTED_LOCALES.includes(saved) ? saved : 'en'
    return <Navigate to={`/${fallback}`} replace />
  }

  return (
    <>
      <Outlet />
      {/* SNS 분석 완료·실패를 어느 탭에 있든 알려주는 전역 배너. 여기(모든
          locale 라우트의 공통 부모)에 둬야 홈/지도/분석기/기타 탭 전부에서
          useLocation()으로 "지금 분석기 화면인지"를 판단할 수 있다 —
          자세한 이유는 analysis-completion-banner.tsx 참고. */}
      <AnalysisCompletionBanner />
    </>
  )
}
