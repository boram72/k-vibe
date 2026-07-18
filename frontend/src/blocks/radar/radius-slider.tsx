import { useTranslation } from 'react-i18next'
import { RADAR_RADIUS_STEPS } from '@/lib/radar-radius'

interface RadiusSliderProps {
  value: number
  onChange: (value: number) => void
}

function formatRadius(value: number): string {
  return value >= 1000 ? `${value / 1000}km` : `${value}m`
}

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const { t } = useTranslation()
  const currentIndex = RADAR_RADIUS_STEPS.indexOf(value as (typeof RADAR_RADIUS_STEPS)[number])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t('radar.radius')}</span>
        <span className="text-xs font-semibold text-primary">{formatRadius(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={RADAR_RADIUS_STEPS.length - 1}
        value={currentIndex === -1 ? 1 : currentIndex}
        onChange={(e) => onChange(RADAR_RADIUS_STEPS[Number(e.target.value)])}
        className="h-1.5 w-full cursor-pointer rounded-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {RADAR_RADIUS_STEPS.map((step) => (
          <span key={step}>{formatRadius(step)}</span>
        ))}
      </div>
    </div>
  )
}
