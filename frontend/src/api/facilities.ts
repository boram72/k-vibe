import { apiClient } from '@/api/client'
import { type Facility, type FacilityFilter, type FacilityType } from '@/types/facility'

// Facility radar is backed by the Kakao Local API (via our backend's
// /amenities endpoint) — see backend/externelAPI_services/amenities.py.
// No mock fallback here: coverage genuinely varies by region, and faking
// Seoul-shaped data would misrepresent that as a bug. A failed call surfaces
// as a real error (isError in RadarPage's useQuery), same as any other live
// data fetch.

interface AmenityApiItem {
  id: string | null
  name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  distance: number | null
  tel: string | null
  category: FacilityType
}

export interface FacilityQuery {
  lat: number
  lng: number
  radius: number
  filter: FacilityFilter
  locale?: string
}

function toFacility(item: AmenityApiItem): Facility | null {
  if (item.latitude == null || item.longitude == null) return null
  return {
    id: item.id ?? `${item.latitude},${item.longitude}`,
    type: item.category,
    name: item.name ?? '',
    address: item.address ?? '',
    distance: item.distance != null ? Math.round(item.distance) : 0,
    lat: item.latitude,
    lng: item.longitude,
    tel: item.tel ?? undefined,
  }
}

export async function fetchFacilities({ lat, lng, radius, filter }: FacilityQuery): Promise<Facility[]> {
  const category = filter === 'all' ? undefined : filter
  const { data } = await apiClient.get<AmenityApiItem[]>('/amenities', {
    params: { lat, lng, radius, category },
  })
  return data
    .map(toFacility)
    .filter((facility): facility is Facility => facility !== null)
    .sort((a, b) => a.distance - b.distance)
}

export type { Facility, FacilityType, FacilityFilter }
