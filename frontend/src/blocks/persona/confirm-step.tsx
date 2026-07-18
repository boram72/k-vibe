import { useTranslation } from 'react-i18next'
import { ChevronLeft, Sparkles } from 'lucide-react'
import type { RouteTheme } from '@/types/route-theme'

interface ConfirmStepProps {
  theme: RouteTheme
  detail: string
  onBack: () => void
  onPersonalizeFeed: () => void
}

export function ConfirmStep({ theme, detail, onBack, onPersonalizeFeed }: ConfirmStepProps) {
  const { t } = useTranslation()

  const rows = [
    { label: t('persona.selected_theme'), value: t(`persona.themes.${theme}.label`) },
    { label: t('persona.selected_detail'), value: t(`persona.themes.${theme}.details.${detail}.label`) },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("persona.back_to_moods")}
          className="rounded-lg bg-muted p-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("persona.confirm_eyebrow")}
          </p>
          <h3 className="text-base font-bold text-foreground">
            {t("persona.confirm_title")}
          </h3>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {t("persona.confirm_body")}
        </p>
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2"
            >
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-right text-sm font-semibold text-foreground">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onPersonalizeFeed}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
      >
        <Sparkles className="h-4 w-4" />
        {t('persona.personalize_feed')}
      </button>
    </div>
  )
}
