import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, MapPin } from 'lucide-react'
import { Map as KakaoMap, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPlaceCategoryMeta, type Place } from '@/types/place'

interface Coordinates {
  lat: number
  lng: number
}

interface MapCanvasProps {
  center: Coordinates
  places: Place[]
  fitPlaces?: Place[]
  selectedPlaceId?: string
  onSelectPlace: (place: Place) => void
  onRequestLocation: () => void
  locationLabel: string
}

// Icon-badge pins colored per category (types/place.ts PLACE_CATEGORIES.pinBg) —
// same pattern as radar-map-preview.tsx's facility pins. The map tiles are
// colorful, so pins need a color that doesn't blend into the neutral
// zinc-theme tokens used elsewhere; category color also doubles as a legend.
function pinClassName(selected: boolean, pinBg: string) {
  return cn(
    'flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105',
    pinBg,
    selected && 'scale-110 ring-2 ring-white',
  )
}

function hasValidCoordinates(place: Pick<Place, 'lat' | 'lng'>): boolean {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng)
}

function buildPlaceBounds(places: Place[]) {
  if (places.length === 0) return null
  return places.reduce(
    (bounds, place) => ({
      minLat: Math.min(bounds.minLat, place.lat),
      maxLat: Math.max(bounds.maxLat, place.lat),
      minLng: Math.min(bounds.minLng, place.lng),
      maxLng: Math.max(bounds.maxLng, place.lng),
    }),
    { minLat: places[0].lat, maxLat: places[0].lat, minLng: places[0].lng, maxLng: places[0].lng },
  )
}

function fitKakaoMapToPlaces(map: kakao.maps.Map, places: Place[]) {
  if (typeof kakao === 'undefined' || !kakao.maps || places.length === 0) return

  if (places.length === 1) {
    map.setCenter(new kakao.maps.LatLng(places[0].lat, places[0].lng))
    map.setLevel(4)
    return
  }

  const bounds = new kakao.maps.LatLngBounds()
  places.forEach((place) => bounds.extend(new kakao.maps.LatLng(place.lat, place.lng)))
  map.setBounds(bounds, 48, 48, 48, 48)
}

// Tapping the badge itself recenters the map on the user's current location —
// no need to also parse the raw lat/lng it used to show underneath.
function LocationOverlay({ locationLabel, onRequestLocation }: { locationLabel: string; onRequestLocation: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onRequestLocation}
      title={t('map.refresh_location')}
      className="absolute left-3 top-3 flex items-center gap-1.5 rounded-xl border border-border bg-popover/90 px-3 py-2 backdrop-blur transition-colors hover:bg-popover"
    >
      <LocateFixed className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-semibold text-popover-foreground">{locationLabel}</span>
    </button>
  )
}

// Standalone "open the analyzer" shortcut was removed — SNS 분석기 already has
// its own bottom-nav/sidebar tab, so this was a redundant second entry point.
function MapActionButtons({ onRequestLocation }: { onRequestLocation: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-2">
      <Button size="icon" onClick={onRequestLocation} title={t('map.refresh_location')} aria-label={t('map.refresh_location')}>
        <LocateFixed className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Percent-based pin placement — fallback used whenever VITE_KAKAO_MAP_KEY isn't
// configured, or the real SDK fails to load. Mirrors src/api/client.ts's
// withFallback() philosophy: degrade gracefully instead of breaking the page.
function pinPosition(place: Place, center: Coordinates, fitPlaces: Place[] = []) {
  const bounds = buildPlaceBounds(fitPlaces)
  if (bounds && fitPlaces.length > 1) {
    const minSpan = 0.01
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, minSpan)
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, minSpan)
    const centerLat = (bounds.maxLat + bounds.minLat) / 2
    const centerLng = (bounds.maxLng + bounds.minLng) / 2
    const pad = 0.2
    const minLat = centerLat - (latSpan / 2) * (1 + pad)
    const maxLat = centerLat + (latSpan / 2) * (1 + pad)
    const minLng = centerLng - (lngSpan / 2) * (1 + pad)
    const maxLng = centerLng + (lngSpan / 2) * (1 + pad)

    return {
      left: `${Math.max(8, Math.min(92, ((place.lng - minLng) / (maxLng - minLng)) * 100))}%`,
      top: `${Math.max(10, Math.min(88, ((maxLat - place.lat) / (maxLat - minLat)) * 100))}%`,
    }
  }

  const lngOffset = (place.lng - center.lng) * 2600
  const latOffset = (center.lat - place.lat) * 3600
  const left = Math.max(8, Math.min(92, 50 + lngOffset))
  const top = Math.max(10, Math.min(88, 50 + latOffset))
  return { left: `${left}%`, top: `${top}%` }
}

function PercentMapCanvas({ center, places, fitPlaces = [], selectedPlaceId, onSelectPlace, onRequestLocation, locationLabel }: MapCanvasProps) {
  return (
    <div className="relative h-full min-h-70 w-full overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
        <MapPin className="h-12 w-12" />
      </div>

      {places.map((place) => {
        const selected = place.id === selectedPlaceId
        const { icon: Icon, pinBg } = getPlaceCategoryMeta(place.category)
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace(place)}
            title={place.name}
            style={pinPosition(place, center, fitPlaces)}
            className={cn('absolute -translate-x-1/2 -translate-y-1/2', pinClassName(selected, pinBg))}
          >
            <Icon className="h-3.75 w-3.75" />
          </button>
        )
      })}

      <LocationOverlay locationLabel={locationLabel} onRequestLocation={onRequestLocation} />
      <MapActionButtons onRequestLocation={onRequestLocation} />
    </div>
  )
}

function KakaoMapCanvas(props: MapCanvasProps) {
  const { center, places, fitPlaces = [], selectedPlaceId, onSelectPlace, onRequestLocation, locationLabel } = props
  const boundedPlaces = useMemo(() => fitPlaces.filter(hasValidCoordinates), [fitPlaces])
  const boundsKey = boundedPlaces.map((place) => `${place.id}:${place.lat},${place.lng}`).join('|')
  // Explicit https:// — the SDK's default loader URL is protocol-relative
  // ("//dapi.kakao.com/..."), which resolves to http:// on our http://localhost
  // dev server. Kakao's CDN rejects plain http requests (ERR_BLOCKED_BY_ORB).
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    url: 'https://dapi.kakao.com/v2/maps/sdk.js',
  })

  useEffect(() => {
    if (error) console.warn('[map] Kakao Maps SDK failed to load, falling back to percent-coordinate preview:', error)
  }, [error])

  // Selecting a place (map pin or list item — same onSelectPlace handler)
  // pans the camera to it and the camera stays there even after the detail
  // sheet closes (selectedPlaceId clears) — closing the sheet shouldn't snap
  // the view back. Only a genuinely new search center (GPS refresh, an
  // incoming focus place from another page) clears the override.
  //
  // Implemented as "adjusting state during render" (the pattern React docs
  // recommend over an effect for this exact case: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // — comparing against the previous render's props and calling setState
  // directly in the render body, which React applies before committing
  // instead of running it as a separate, extra-render effect. Declared
  // before the loading/error early-return below so hook order stays stable.
  const [focusCenter, setFocusCenter] = useState<Coordinates | null>(null)
  const [map, setMap] = useState<kakao.maps.Map | null>(null)
  const [prevCenter, setPrevCenter] = useState(center)
  const [prevBoundsKey, setPrevBoundsKey] = useState(boundsKey)
  const [prevSelectedPlaceId, setPrevSelectedPlaceId] = useState(selectedPlaceId)

  if (center.lat !== prevCenter.lat || center.lng !== prevCenter.lng) {
    setPrevCenter(center)
    setFocusCenter(null)
  }
  if (boundsKey !== prevBoundsKey) {
    setPrevBoundsKey(boundsKey)
    setFocusCenter(null)
  }
  if (selectedPlaceId !== prevSelectedPlaceId) {
    setPrevSelectedPlaceId(selectedPlaceId)
    const place = places.find((p) => p.id === selectedPlaceId)
    if (place) setFocusCenter({ lat: place.lat, lng: place.lng })
  }

  useEffect(() => {
    if (!map || focusCenter || boundedPlaces.length === 0) return
    fitKakaoMapToPlaces(map, boundedPlaces)
  }, [boundedPlaces, boundsKey, focusCenter, map])

  if (loading || error) {
    return <PercentMapCanvas {...props} />
  }

  const mapCenter = focusCenter ?? center

  return (
    <div className="relative h-full min-h-70 w-full overflow-hidden">
      <KakaoMap center={mapCenter} level={4} isPanto className="h-full w-full" onCreate={setMap}>
        {places.map((place) => {
          const selected = place.id === selectedPlaceId
          const { icon: Icon, pinBg } = getPlaceCategoryMeta(place.category)
          return (
            <CustomOverlayMap key={place.id} position={{ lat: place.lat, lng: place.lng }} clickable zIndex={selected ? 2 : 1}>
              <button
                type="button"
                onClick={() => onSelectPlace(place)}
                title={place.name}
                className={pinClassName(selected, pinBg)}
              >
                <Icon className="h-3.75 w-3.75" />
              </button>
            </CustomOverlayMap>
          )
        })}
      </KakaoMap>

      <LocationOverlay locationLabel={locationLabel} onRequestLocation={onRequestLocation} />
      <MapActionButtons onRequestLocation={onRequestLocation} />
    </div>
  )
}

export function MapCanvas(props: MapCanvasProps) {
  if (!import.meta.env.VITE_KAKAO_MAP_KEY) {
    return <PercentMapCanvas {...props} />
  }
  return <KakaoMapCanvas {...props} />
}
