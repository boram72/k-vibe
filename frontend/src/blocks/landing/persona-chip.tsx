// [미사용, 2026-09 서비스 컨셉 변경(PR #11)] home-feed.tsx 전용 컴포넌트 — 그
// 파일과 같은 사유로 미사용(원복 방법은 home-feed.tsx 주석 참고). 참고:
// lib/persona-preference.ts의 읽기(readPersonaPreference)는 profile-header.tsx가
// 별도로 여전히 쓰고 있어 안 죽었지만, 쓰기(savePersonaPreference)는 PersonaPage의
// 옛 위저드가 폐기되며 호출부가 없어짐 — 두 함수 상태가 서로 다름에 주의.
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
