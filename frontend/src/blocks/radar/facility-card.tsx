import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Accessibility, ChevronDown, ChevronUp, Clock, ExternalLink, MapPin } from 'lucide-react'
import { getFacilityTypeMeta, type Facility } from '@/types/facility'
import { buildGoogleMapsFacilityUrl } from '@/lib/facility-share'
import { cn } from '@/lib/utils'

interface FacilityCardProps {
  facility: Facility
  onViewOnInternalMap: (facility: Facility) => void
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`
}

export function FacilityCard({ facility, onViewOnInternalMap }: FacilityCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const typeMeta = getFacilityTypeMeta(facility.type)
  const Icon = typeMeta.icon

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted">
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 p-3.5 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', typeMeta.bg, typeMeta.color)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-semibold', typeMeta.bg, typeMeta.color)}>
                {t(typeMeta.labelKey)}
              </span>
              {facility.is24h && (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-500">
                  {t('radar.twenty_four_hours')}
                </span>
              )}
              {facility.isOpen === false && (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                  {t('radar.closed')}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{facility.name}</p>
            <p className="truncate text-xs text-muted-foreground">{facility.address}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-bold text-primary">{formatDistance(facility.distance)}</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </button>

        <div className="my-3 mr-3 flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onViewOnInternalMap(facility)}
            aria-label={t('radar.view_on_internal_map', { name: facility.name })}
            title={t('radar.view_on_internal_map', { name: facility.name })}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors hover:border-primary/55 hover:bg-primary/20"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <a
            href={buildGoogleMapsFacilityUrl(facility)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('radar.open_facility_map', { name: facility.name })}
            title={t('radar.open_facility_map', { name: facility.name })}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-border px-3.5 pb-3.5 pt-2.5">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>{facility.address}</span>
          </div>
          {facility.floor && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0 text-primary" />
              <span>{facility.floor}</span>
            </div>
          )}
          {facility.hasDisabled && (
            <div className="flex items-center gap-2 text-xs text-emerald-500">
              <Accessibility className="h-3 w-3" />
              <span>{t('radar.accessible_restroom')}</span>
            </div>
          )}
          {facility.extra && <div className="rounded-lg bg-background px-2.5 py-1.5 text-xs text-muted-foreground">{facility.extra}</div>}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onViewOnInternalMap(facility)}
              className="rounded-lg bg-primary/15 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              {t('radar.view_on_map')}
            </button>
            <a
              href={buildGoogleMapsFacilityUrl(facility)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border py-2 text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('radar.open_facility_map_short')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
