import { useTranslation } from 'react-i18next'
import { ROUTE_THEME_OPTIONS, getRouteThemeOption, type RouteTheme } from '@/types/route-theme'
import { cn } from '@/lib/utils'

interface DetailStepProps {
  theme: RouteTheme | ''
  detail: string
  onSelectTheme: (theme: RouteTheme) => void
  onSelectDetail: (detail: string) => void
}

export function DetailStep({ theme, detail, onSelectTheme, onSelectDetail }: DetailStepProps) {
  const { t } = useTranslation()
  const themeOption = theme ? getRouteThemeOption(theme) : null

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROUTE_THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectTheme(opt.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              theme === opt.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted text-muted-foreground hover:border-primary/40',
            )}
          >
            <span>{opt.badge}</span>
            <span>{t(`persona.themes.${opt.id}.label`)}</span>
          </button>
        ))}
      </div>

      {themeOption ? (
        <div className="grid grid-cols-2 gap-2">
          {themeOption.detailIds.map((detailId) => (
            <button
              key={detailId}
              type="button"
              onClick={() => onSelectDetail(detailId)}
              className={cn(
                'min-h-28 rounded-xl border p-3 text-left transition-colors',
                detail === detailId
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:border-primary/35',
              )}
            >
              <p className="text-sm font-semibold">{t(`persona.themes.${theme}.details.${detailId}.label`)}</p>
              <p className="mt-1 text-xs leading-5 opacity-80">
                {t(`persona.themes.${theme}.details.${detailId}.description`)}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-muted-foreground">{t('persona.choose_theme_first')}</p>
      )}
    </div>
  )
}
