import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'
import zh from '@/messages/zh.json'

export const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  ko: { label: '한국어', flag: '🇰🇷' },
  en: { label: 'English', flag: '🇺🇸' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
}

export const LOCALE_STORAGE_KEY = 'k-vibe-locale'

// 2026-09 버그 수정(FRONTEND_TODO_map_pan_search.md) — 예전엔 여기서 항상
// 'en'으로 먼저 초기화한 뒤 LocaleGuard.tsx가 마운트 후 effect에서
// changeLanguage(urlLocale)를 불러서, locale 의존 useQuery(예: PersonaPicker의
// ['k-content-personas', locale])가 en으로 1차 호출→ko로 2차 호출하는 낭비가
// 있었다. URL 경로(SSR 없는 SPA라 location.pathname을 그냥 동기적으로 읽어도
// 안전)에서 첫 렌더 전에 미리 올바른 locale을 읽어 초기값으로 넣으면, 이후
// LocaleGuard의 changeLanguage 호출은 이미 같은 값이라 사실상 no-op이 된다.
function detectInitialLocale(): Locale {
  const pathLocale = window.location.pathname.split('/')[1]
  if (SUPPORTED_LOCALES.includes(pathLocale as Locale)) return pathLocale as Locale

  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (SUPPORTED_LOCALES.includes(saved as Locale)) return saved as Locale

  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: detectInitialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
