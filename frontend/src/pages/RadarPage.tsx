import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Radar as RadarIcon, RefreshCw } from 'lucide-react'
import { RadiusSlider } from '@/blocks/radar/radius-slider'
import { FacilityFilterTabs } from '@/blocks/radar/facility-filter-tabs'
import { RadarMapPreview } from '@/blocks/radar/radar-map-preview'
import { FacilityList } from '@/blocks/radar/facility-list'
import { fetchFacilities } from '@/api/facilities'
import { getNextRadarRadius } from '@/lib/radar-radius'
import { useCurrentLocation } from '@/lib/use-current-location'
import { usePageHelpStore } from '@/store/page-help-store'
import { cn } from '@/lib/utils'
import type { Facility, FacilityFilter } from '@/types/facility'
import type { MapFocusState } from './MapPage'

export default function RadarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { coords, locationLabel, requestLocation } = useCurrentLocation()

  const [radius, setRadius] = useState(500)
  const [filter, setFilter] = useState<FacilityFilter>('all')

  useEffect(() => {
    setHelp(t('radar.help_title'), t('radar.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  // Guards against StrictMode's dev-only double-invoke of mount effects —
  // without this, a denied/unavailable geolocation request fires its
  // requestLocation() call twice, producing two identical toasts. The ref
  // persists across that synthetic remount, so the second invocation is a
  // no-op.
  const didRequestLocationRef = useRef(false)
  useEffect(() => {
    if (didRequestLocationRef.current) return
    didRequestLocationRef.current = true
    requestLocation()
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    data: facilities = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['radar-facilities', coords.lat, coords.lng, radius, filter],
    queryFn: () => fetchFacilities({ lat: coords.lat, lng: coords.lng, radius, filter }),
  })

  const nextRadius = getNextRadarRadius(radius)

  function expandRadius() {
    if (nextRadius) setRadius(nextRadius)
  }

  function viewFacilityOnInternalMap(facility: Facility) {
    const state: MapFocusState = {
      focusPlaces: [{ id: facility.id, name: facility.name, category: 'culture', address: facility.address, lat: facility.lat, lng: facility.lng }],
      openDetail: true,
    }
    navigate('../map', { state })
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-4rem)] w-full flex-col overflow-hidden px-4 md:h-[calc(100dvh-3.5rem)] md:max-w-6xl">
      <div className="shrink-0 space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <RadarIcon className="h-4.5 w-4.5 text-primary" />
              {t("radar.title")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {locationLabel} / {t("radar.found", { count: facilities.length })}{" "}
              / {t("radar.source_mock")}
            </p>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            aria-label={t("radar.refresh")}
            className="rounded-xl bg-muted p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>

        <div className="rounded-xl bg-muted p-3">
          <RadiusSlider value={radius} onChange={setRadius} />
        </div>

        <FacilityFilterTabs value={filter} onChange={setFilter} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 pb-4 md:grid md:grid-cols-[1fr_420px]">
        <div className="shrink-0 md:h-full md:min-h-0 h-[35vh]">
          {!isLoading && !isError && facilities.length > 0 && (
            <RadarMapPreview
              center={coords}
              facilities={facilities}
              radius={radius}
              onViewOnInternalMap={viewFacilityOnInternalMap}
            />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FacilityList
            facilities={facilities}
            isLoading={isLoading}
            isError={isError}
            nextRadius={nextRadius}
            onRetry={() => refetch()}
            onExpandRadius={expandRadius}
            onViewOnInternalMap={viewFacilityOnInternalMap}
          />
        </div>
      </div>
    </div>
  );
}
