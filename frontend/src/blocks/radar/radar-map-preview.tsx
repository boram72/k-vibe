import { useTranslation } from 'react-i18next'
import { Crosshair, LocateFixed } from 'lucide-react'
import { getFacilityTypeMeta, type Facility } from '@/types/facility'

interface Coordinates {
  lat: number
  lng: number
}

interface RadarMapPreviewProps {
  center: Coordinates
  facilities: Facility[]
  radius: number
  onViewOnInternalMap: (facility: Facility) => void
}

function toPreviewPoint(center: Coordinates, facility: Facility, radius: number) {
  const metersPerLat = 111_320
  const metersPerLng = 111_320 * Math.cos((center.lat * Math.PI) / 180)
  const xMeters = (facility.lng - center.lng) * metersPerLng
  const yMeters = (center.lat - facility.lat) * metersPerLat
  const scale = Math.max(radius, 1)
  const x = 50 + (xMeters / scale) * 42
  const y = 50 + (yMeters / scale) * 42

  return {
    x: Math.max(8, Math.min(92, x)),
    y: Math.max(8, Math.min(92, y)),
  }
}

export function RadarMapPreview({ center, facilities, radius, onViewOnInternalMap }: RadarMapPreviewProps) {
  const { t } = useTranslation()
  const previewFacilities = facilities.slice(0, 12)

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-muted p-3" aria-label={t('radar.map_title')}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('radar.map_title')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('radar.map_subtitle', { radius })}</p>
        </div>
        <Crosshair className="h-4.5 w-4.5 shrink-0 text-primary" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-size-[34px_34px] opacity-40" />
        <div className="absolute inset-[14%] rounded-full border border-primary/25" />
        <div className="absolute inset-[26%] rounded-full border border-border" />
        <div className="absolute inset-[38%] rounded-full border border-border" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-border" />

        <div className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-lg">
          <LocateFixed className="h-4.5 w-4.5" aria-label={t('radar.current_position')} />
        </div>

        {previewFacilities.map((facility) => {
          const point = toPreviewPoint(center, facility, radius)
          const typeMeta = getFacilityTypeMeta(facility.type)
          const Icon = typeMeta.icon
          return (
            <button
              key={facility.id}
              type="button"
              onClick={() => onViewOnInternalMap(facility)}
              aria-label={t('radar.view_on_internal_map', { name: facility.name })}
              title={`${t(typeMeta.labelKey)} / ${facility.distance}m`}
              className={`absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 ${typeMeta.pinBg}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <Icon className="h-3.75 w-3.75" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
