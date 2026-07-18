import type { RouteStop } from '@/lib/route-draft'
import type { CrowdLevel } from '@/types/place'

const MAX_SHARED_ROUTE_STOPS = 10

function formatCoordinates(stop: Pick<RouteStop, 'lat' | 'lng'>): string {
  return `${stop.lat},${stop.lng}`
}

export function buildGoogleMapsDirectionsUrl(stops: Pick<RouteStop, 'lat' | 'lng'>[]): string | null {
  if (stops.length === 0) return null

  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('travelmode', 'walking')

  if (stops.length === 1) {
    url.searchParams.set('destination', formatCoordinates(stops[0]))
    return url.toString()
  }

  url.searchParams.set('origin', formatCoordinates(stops[0]))
  url.searchParams.set('destination', formatCoordinates(stops[stops.length - 1]))

  const waypoints = stops.slice(1, -1).map(formatCoordinates)
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join('|'))
  }

  return url.toString()
}

export function buildGoogleMapsPlaceUrl(stop: Pick<RouteStop, 'lat' | 'lng'>): string {
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', formatCoordinates(stop))
  return url.toString()
}

// base64url encode/decode of UTF-8 text (TextEncoder, not raw btoa) so
// Korean/Japanese/Chinese stop names survive round-tripping through the URL.
function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

interface SharedRoutePayload {
  v: 1
  stops: RouteStop[]
}

export function encodeRouteForShare(stops: RouteStop[]): string {
  const payload: SharedRoutePayload = {
    v: 1,
    stops: stops.slice(0, MAX_SHARED_ROUTE_STOPS).map((stop) => ({
      id: stop.id,
      name: stop.name,
      category: stop.category,
      address: stop.address,
      crowdLevel: stop.crowdLevel,
      lat: stop.lat,
      lng: stop.lng,
      stayMinutes: stop.stayMinutes,
      startTime: stop.startTime,
      date: stop.date,
      isAnchor: stop.isAnchor,
      description: stop.description,
      tags: stop.tags?.slice(0, 8),
    })),
  }
  return base64UrlEncode(JSON.stringify(payload))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coerceNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function coerceNumberInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

function coerceCrowdLevel(value: unknown): CrowdLevel | undefined {
  return value === 'low' || value === 'mid' || value === 'high' ? value : undefined
}

function coerceSharedStop(value: unknown, index: number): RouteStop | null {
  if (!isRecord(value)) return null

  const name = coerceNonEmptyString(value.name)
  const lat = coerceNumberInRange(value.lat, -90, 90)
  const lng = coerceNumberInRange(value.lng, -180, 180)
  if (!name || lat === null || lng === null) return null

  const stayMinutes = coerceNumberInRange(value.stayMinutes, 5, 360)

  return {
    id: coerceNonEmptyString(value.id) ?? `shared-stop-${index + 1}`,
    name,
    category: coerceNonEmptyString(value.category) ?? 'Spot',
    address: coerceNonEmptyString(value.address) ?? '',
    crowdLevel: coerceCrowdLevel(value.crowdLevel),
    lat,
    lng,
    stayMinutes: stayMinutes === null ? undefined : Math.round(stayMinutes),
    startTime: coerceNonEmptyString(value.startTime) ?? undefined,
    date: coerceNonEmptyString(value.date) ?? undefined,
    isAnchor: value.isAnchor === true,
    description: coerceNonEmptyString(value.description) ?? undefined,
    tags: Array.isArray(value.tags)
      ? value.tags.map((tag) => coerceNonEmptyString(tag)).filter((tag): tag is string => tag !== null).slice(0, 8)
      : undefined,
  }
}

export function decodeRouteFromShare(value: string): RouteStop[] | null {
  try {
    const payload = JSON.parse(base64UrlDecode(value)) as unknown
    if (!isRecord(payload)) return null

    const rawStops = Array.isArray(payload.stops) ? payload.stops : []
    const stops = rawStops
      .slice(0, MAX_SHARED_ROUTE_STOPS)
      .map((stop, index) => coerceSharedStop(stop, index))
      .filter((stop): stop is RouteStop => stop !== null)

    return stops.length > 0 ? stops : null
  } catch {
    return null
  }
}
