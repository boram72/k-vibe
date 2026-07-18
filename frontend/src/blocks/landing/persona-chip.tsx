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
