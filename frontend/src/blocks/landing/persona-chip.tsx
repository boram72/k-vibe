// [미사용, 2026-09 서비스 컨셉 변경(PR #11)] home-feed.tsx 전용 컴포넌트 — 그
// 파일과 같은 사유로 미사용(원복 방법은 home-feed.tsx 주석 참고). 참고:
// lib/persona-preference.ts는 profile-header.tsx의 페르소나 뱃지 삭제로
// 읽기(readPersonaPreference)까지 마지막 호출부가 없어져서 이제 파일 전체가
// 미사용 — 자세한 내용은 그 파일 주석 참고.
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import type { PersonaPreference } from '@/lib/persona-preference'
import { cn } from '@/lib/utils'

interface PersonaChipProps {
  preference: PersonaPreference
  active: boolean
  onToggle: () => void
}

export function PersonaChip({ preference, active, onToggle }: PersonaChipProps) {
  const { t } = useTranslation()
  const personaLabel = t(`persona.themes.${preference.theme}.details.${preference.detail}.label`)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      {t('landing.personalized_for', { persona: personaLabel })}
    </button>
  )
}
