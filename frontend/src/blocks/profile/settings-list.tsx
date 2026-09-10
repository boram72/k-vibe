import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Languages } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '@/i18n'
import { cn } from '@/lib/utils'

// 2026-09 태스크보드 10번: 알림 설정 삭제(웹이라 실제로 만들 수 없는 기능 —
// LanguageDropdown 주석 참고 스타일과 동일하게, 아예 항목 자체를 뺌). 언어
// 설정은 TopBar의 LanguageDropdown과 같은 방식(URL 경로의 로케일 세그먼트
// 교체)으로 실제 전환 가능하게 만듦.
//
// "Offline maps" / "map data" 항목은 원래 설계에서부터 제외 — 웹 지도 API엔
// 오프라인 타일 다운로드 기능이 아예 없어서(어떤 지도 provider를 쓰든) 이
// 아키텍처에서는 절대 실기능이 될 수 없음.
export function SettingsList() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const segments = location.pathname.split('/')
  const current = segments[1] as Locale

  function switchLocale(code: Locale) {
    segments[1] = code
    navigate(segments.join('/'))
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-bold text-foreground">{t('profile.settings_title')}</p>
      </div>
      <div className="flex w-full items-center gap-3 px-4 py-4">
        <Languages className="h-4.5 w-4.5 text-primary" />
        <span className="flex-1 text-sm font-medium text-foreground">{t('profile.settings_language')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{LOCALE_META[current]?.flag}</span>
            {LOCALE_META[current]?.label}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SUPPORTED_LOCALES.map((code) => (
              <DropdownMenuItem
                key={code}
                onClick={() => switchLocale(code)}
                className={cn(current === code && 'font-semibold text-primary')}
              >
                <span className="mr-2">{LOCALE_META[code].flag}</span>
                {LOCALE_META[code].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  )
}
