import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Search } from 'lucide-react'
import { Map as KakaoMap, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/place'

interface Coordinates {
  lat: number
  lng: number
}

interface MapCanvasProps {
  center: Coordinates
  places: Place[]
  selectedPlaceId?: string
  onSelectPlace: (place: Place) => void
  onRequestLocation: () => void
  locationLabel: string
}

// Hot pink — the map tiles themselves are colorful, so the neutral zinc-theme
// tokens (bg-popover/bg-primary) used everywhere else in the app blend in and
// are hard to spot. Pins need a color that doesn't appear elsewhere on the map.
function pinClassName(selected: boolean) {
  return cn(
    'whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-lg transition-colors',
    selected
      ? 'border-white bg-pink-600 text-white scale-110'
      : 'border-pink-600 bg-pink-500 text-white hover:bg-pink-600',
  )
}

function LocationOverlay({ locationLabel, center }: { locationLabel: string; center: Coordinates }) {
  return (
    <div className="absolute left-3 top-3 rounded-xl border border-border bg-popover/90 px-3 py-2 backdrop-blur">
      <p className="text-xs font-semibold text-popover-foreground">{locationLabel}</p>
      <p className="font-mono text-[10px] text-muted-foreground">
        {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
      </p>
    </div>
  )
}

function MapActionButtons({ onRequestLocation }: { onRequestLocation: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        nativeButton={false}
        render={<Link to="analyze" />}
        aria-label={t('map.open_analyzer')}
      >
        <Search className="h-4 w-4" />
      </Button>
      <Button size="icon" onClick={onRequestLocation} aria-label={t('map.refresh_location')}>
        <Navigation className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Percent-based pin placement — fallback used whenever VITE_KAKAO_MAP_KEY isn't
// configured, or the real SDK fails to load. Mirrors src/api/client.ts's
// withFallback() philosophy: degrade gracefully instead of breaking the page.
function pinPosition(place: Place, center: Coordinates) {
  const lngOffset = (place.lng - center.lng) * 2600
  const latOffset = (center.lat - place.lat) * 3600
  const left = Math.max(8, Math.min(92, 50 + lngOffset))
  const top = Math.max(10, Math.min(88, 50 + latOffset))
  return { left: `${left}%`, top: `${top}%` }
}

function PercentMapCanvas({ center, places, selectedPlaceId, onSelectPlace, onRequestLocation, locationLabel }: MapCanvasProps) {
  return (
    <div className="relative h-full min-h-70 w-full overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
        <MapPin className="h-12 w-12" />
      </div>

      {places.map((place) => {
        const selected = place.id === selectedPlaceId
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace(place)}
            style={pinPosition(place, center)}
            className={cn('absolute -translate-x-1/2 -translate-y-1/2', pinClassName(selected))}
          >
            {place.name}
          </button>
        )
      })}

      <LocationOverlay locationLabel={locationLabel} center={center} />
      <MapActionButtons onRequestLocation={onRequestLocation} />
    </div>
  )
}

function KakaoMapCanvas(props: MapCanvasProps) {
  const { center, places, selectedPlaceId, onSelectPlace, onRequestLocation, locationLabel } = props
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
  const [prevCenter, setPrevCenter] = useState(center)
  const [prevSelectedPlaceId, setPrevSelectedPlaceId] = useState(selectedPlaceId)

  if (center.lat !== prevCenter.lat || center.lng !== prevCenter.lng) {
    setPrevCenter(center)
    setFocusCenter(null)
  }
  if (selectedPlaceId !== prevSelectedPlaceId) {
    setPrevSelectedPlaceId(selectedPlaceId)
    const place = places.find((p) => p.id === selectedPlaceId)
    if (place) setFocusCenter({ lat: place.lat, lng: place.lng })
  }

  if (loading || error) {
    return <PercentMapCanvas {...props} />
  }

  const mapCenter = focusCenter ?? center

  return (
    <div className="relative h-full min-h-70 w-full overflow-hidden">
      <KakaoMap center={mapCenter} level={4} isPanto className="h-full w-full">
        {places.map((place) => {
          const selected = place.id === selectedPlaceId
          return (
            <CustomOverlayMap key={place.id} position={{ lat: place.lat, lng: place.lng }} clickable zIndex={selected ? 2 : 1}>
              <button type="button" onClick={() => onSelectPlace(place)} className={pinClassName(selected)}>
                {place.name}
              </button>
            </CustomOverlayMap>
          )
        })}
      </KakaoMap>

      <LocationOverlay locationLabel={locationLabel} center={center} />
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
