import { useTranslation } from 'react-i18next'

interface DayDividerProps {
  dayNumber: number
  date: string // ISO "YYYY-MM-DD"
}

export function DayDivider({ dayNumber, date }: DayDividerProps) {
  const { t, i18n } = useTranslation()
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
        {t('route.day_label', { day: dayNumber })}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{formatted}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
