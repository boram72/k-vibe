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
  // 2026-09 태스크보드 12번 — 지도에 "내 위치" 마커를 찍을 때, 진짜 GPS 실측값일
  // 때만 찍고 마지막 위치 캐시/서울 폴백일 땐 안 찍기 위해 구분용으로 추가.
  // (폴백 좌표에 마커를 찍으면 실제로 그 자리에 있는 것처럼 오해할 수 있음)
  const [isPrecise, setIsPrecise] = useState(false)

  const fallbackToLastKnownOrSeoul = useCallback(() => {
    const cached = readLastKnownLocation()
    setIsPrecise(false)
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
        setIsPrecise(true)
        writeLastKnownLocation(next)
      },
      () => {
        fallbackToLastKnownOrSeoul()
        toast.warning(t('map.location_unavailable'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300_000 },
    )
  }, [t, fallbackToLastKnownOrSeoul])

  return { coords, locationLabel, requestLocation, isPrecise }
}
