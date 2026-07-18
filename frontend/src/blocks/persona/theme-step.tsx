import { useTranslation } from 'react-i18next'
import { ChevronRight, Clock } from 'lucide-react'
import { ROUTE_THEME_OPTIONS, type RouteTheme } from '@/types/route-theme'

interface ThemeStepProps {
  startTime: string
  onStartTimeChange: (value: string) => void
  onSelectTheme: (theme: RouteTheme) => void
}

export function ThemeStep({ startTime, onStartTimeChange, onSelectTheme }: ThemeStepProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted p-3">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="persona-start-time">
          {t('persona.start_time')}
        </label>
        <div className="relative mt-2">
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="persona-start-time"
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {ROUTE_THEME_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelectTheme(option.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted p-4 text-left transition-colors hover:border-primary/35"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
            {option.badge}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{t(`persona.themes.${option.id}.label`)}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t(`persona.themes.${option.id}.description`)}
            </p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}
