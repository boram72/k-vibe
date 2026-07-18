import type { Facility } from '@/types/facility'

export function buildGoogleMapsFacilityUrl(facility: Pick<Facility, 'lat' | 'lng'>): string {
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', `${facility.lat},${facility.lng}`)
  return url.toString()
}
