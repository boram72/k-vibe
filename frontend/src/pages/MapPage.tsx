import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapCanvas } from '@/blocks/map/map-canvas'
import { SpotListPanel } from '@/blocks/map/spot-list-panel'
import { PlaceDetailSheet } from '@/blocks/map/place-detail-sheet'
import { fetchMapPlaces, DEFAULT_MAP_SEARCH_RADIUS } from '@/api/places'
import { fetchSavedPlaces, toggleSavedPlace } from '@/lib/saved-places'
import { usePageHelpStore } from '@/store/page-help-store'
import { useCurrentLocation } from '@/lib/use-current-location'
import { useMediaQuery } from '@/lib/use-media-query'
import { type Place, type PlaceCategory } from '@/types/place'
import { cn } from '@/lib/utils'

// Other features (e.g. Analyze) can hand off a one-time map focus via
// `navigate('../map', { state: { focusPlaces, openDetail } })`. This state lives
// only on that single navigation entry — refreshing or arriving via a normal
// nav tab click means no state, so MapPage falls back to the user's location.
// `openDetail` only auto-opens the detail sheet when there's exactly one focus place.
export interface MapFocusState {
  focusPlaces?: Place[]
  openDetail?: boolean
}

export default function MapPage() {
  const { t, i18n } = useTranslation()
  const setHelp = usePageHelpStore((s) => s.setHelp)
  const clearHelp = usePageHelpStore((s) => s.clearHelp)
  const { coords, locationLabel, requestLocation } = useCurrentLocation()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const routerLocation = useLocation()
  const focusState = routerLocation.state as MapFocusState | null

  const [categories, setCategories] = useState<PlaceCategory[]>(['all'])
  const [search, setSearch] = useState('')
  // Lazy initializer instead of an effect+setState — focusState is already
  // available synchronously at first render (it's router state, not async),
  // so there's no need to "react" to it after the fact.
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(() =>
    focusState?.focusPlaces?.length === 1 && focusState.openDetail ? focusState.focusPlaces[0] : null,
  )
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Focus-place handoffs (Analyze/Persona/Radar → "view on map") re-center the
  // search around that place instead of the user's literal current location.
  const effectiveCoords = focusState?.focusPlaces?.[0]
    ? { lat: focusState.focusPlaces[0].lat, lng: focusState.focusPlaces[0].lng }
    : coords

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['map-places', effectiveCoords.lat, effectiveCoords.lng, i18n.language],
    queryFn: () =>
      fetchMapPlaces({
        lat: effectiveCoords.lat,
        lng: effectiveCoords.lng,
        radius: DEFAULT_MAP_SEARCH_RADIUS,
        locale: i18n.language,
      }),
  })

  const queryClient = useQueryClient()
  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['saved-places'],
    queryFn: fetchSavedPlaces,
  })
  const savedIds = useMemo(() => new Set(savedPlaces.map((p) => p.id)), [savedPlaces])
  const toggleSaveMutation = useMutation({
    mutationFn: toggleSavedPlace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-places'] }),
  })

  useEffect(() => {
    setHelp(t('map.help_title'), t('map.help_body'))
    return () => clearHelp()
  }, [setHelp, clearHelp, t])

  // Guards against StrictMode's dev-only double-invoke of mount effects —
  // without this, requestLocation() fires twice on a denied/unavailable
  // geolocation request, producing two identical toasts. The ref persists
  // across that synthetic remount, so the second invocation is a no-op.
  const didRequestLocationRef = useRef(false)
  useEffect(() => {
    if (!focusState?.focusPlaces?.length && !didRequestLocationRef.current) {
      didRequestLocationRef.current = true
      requestLocation()
    }
    // run once on mount only — focusState is a one-time handoff, not a live dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const effectiveLocationLabel = focusState?.focusPlaces?.length ? t('map.analysis_result') : locationLabel

  const candidates = useMemo(() => {
    if (!focusState?.focusPlaces?.length) return places
    const focusIds = new Set(focusState.focusPlaces.map((p) => p.id))
    return [...focusState.focusPlaces, ...places.filter((p) => !focusIds.has(p.id))]
  }, [places, focusState])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((place) => {
      const matchCategory = categories.includes('all') || categories.includes(place.category)
      const matchSearch =
        !q ||
        place.name.toLowerCase().includes(q) ||
        place.address.toLowerCase().includes(q) ||
        place.tags?.some((tag) => tag.toLowerCase().includes(q))
      const matchSaved = !showSavedOnly || savedIds.has(place.id)
      return matchCategory && matchSearch && matchSaved
    })
  }, [candidates, categories, search, showSavedOnly, savedIds])

  function toggleSave(id: string) {
    const place = candidates.find((p) => p.id === id)
    if (place) toggleSaveMutation.mutate(place)
  }

  return (
    <div
      className={cn(
        'flex h-[calc(100dvh-3.5rem-4rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.5rem)] md:grid',
        isDesktop && isPanelCollapsed ? 'md:grid-cols-[1fr_64px]' : 'md:grid-cols-[1fr_380px]',
      )}
    >
      <div className={cn('min-h-0 md:h-full md:flex-none', !isDesktop && isPanelCollapsed ? 'flex-1' : 'flex-4')}>
        <MapCanvas
          center={effectiveCoords}
          places={filtered}
          selectedPlaceId={selectedPlace?.id}
          onSelectPlace={setSelectedPlace}
          onRequestLocation={requestLocation}
          locationLabel={effectiveLocationLabel}
        />
      </div>

      <SpotListPanel
        isDesktop={isDesktop}
        isCollapsed={isPanelCollapsed}
        onCollapsedChange={setIsPanelCollapsed}
        categories={categories}
        onCategoriesChange={setCategories}
        search={search}
        onSearchChange={setSearch}
        showSavedOnly={showSavedOnly}
        onShowSavedOnlyChange={setShowSavedOnly}
        places={filtered}
        isLoading={isLoading}
        onSelectPlace={setSelectedPlace}
      />

      <PlaceDetailSheet
        place={selectedPlace}
        saved={selectedPlace ? savedIds.has(selectedPlace.id) : false}
        onClose={() => setSelectedPlace(null)}
        onToggleSave={toggleSave}
      />
    </div>
  )
}
