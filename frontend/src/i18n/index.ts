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

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
