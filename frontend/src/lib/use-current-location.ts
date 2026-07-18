import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { readLastKnownLocation, writeLastKnownLocation } from '@/lib/location-cache'

export const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

/**
 * Browser geolocation with a 3-step fallback: ① fresh GPS fix ② last known
 * location cached in localStorage (written whenever a fresh fix succeeds,
 * no expiry) ③ Seoul center. Shared across any page that needs the user's
 * current coordinates (Map, Radar, ...) so both get the same fallback
 * behavior for free.
 */
export function useCurrentLocation() {
  const { t } = useTranslation()
  const [coords, setCoords] = useState(SEOUL_CENTER)
  const [locationLabel, setLocationLabel] = useState(t('map.seoul_fallback'))

  const fallbackToLastKnownOrSeoul = useCallback(() => {
    const cached = readLastKnownLocation()
    if (cached) {
      setCoords(cached)
      setLocationLabel(t('map.last_known_location'))
    } else {
      setCoords(SEOUL_CENTER)
      setLocationLabel(t('map.seoul_fallback'))
    }
  }, [t])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fallbackToLastKnownOrSeoul()
      toast.warning(t('map.location_unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setCoords(next)
        setLocationLabel(t('map.current_location'))
        writeLastKnownLocation(next)
      },
      () => {
        fallbackToLastKnownOrSeoul()
        toast.warning(t('map.location_unavailable'))
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300_000 },
    )
  }, [t, fallbackToLastKnownOrSeoul])

  return { coords, locationLabel, requestLocation }
}
