import { haversineKm, walkingMinutes } from '@/lib/haversine'
import type { CrowdLevel } from '@/types/place'

export interface RouteStop {
  id: string
  name: string
  category: string
  address: string
  crowdLevel: CrowdLevel
  lat: number
  lng: number
  stayMinutes: number
  startTime: string
  description: string
  tags: string[]
}

export interface ScheduledRoute {
  stops: RouteStop[]
  walkingMinutes: number
  stayMinutes: number
  totalMinutes: number
}

// Title/summary aren't computed here — they're i18n text built by the caller
// (using ScheduledRoute.totalMinutes for the "{{duration}}" template), since
// this lib stays i18n-agnostic like the rest of the mock-data layer.
export interface RoutePlan extends ScheduledRoute {
  title: string
  summary: string
  shareText: string
}

export function parseStartTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function calculateWalkingMinutes(stops: Pick<RouteStop, 'lat' | 'lng'>[]): number {
  let total = 0
  for (let i = 0; i < stops.length - 1; i++) {
    total += walkingMinutes(haversineKm(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng))
  }
  return total
}

// Generic over any base stop list (not theme-specific) so Step 10's route editor
// can also reuse this to recompute timing after a user reorders stops.
export function scheduleStops(baseStops: Omit<RouteStop, 'startTime'>[], startTime: string): ScheduledRoute {
  const startMinutes = parseStartTime(startTime) ?? 600

  let cursor = startMinutes
  const stops: RouteStop[] = baseStops.map((stop, index) => {
    if (index > 0) {
      const prev = baseStops[index - 1]
      cursor += walkingMinutes(haversineKm(prev.lat, prev.lng, stop.lat, stop.lng))
    }
    const scheduled: RouteStop = { ...stop, startTime: formatClock(cursor) }
    cursor += stop.stayMinutes
    return scheduled
  })

  const walking = calculateWalkingMinutes(stops)
  const stay = stops.reduce((total, stop) => total + stop.stayMinutes, 0)

  return { stops, walkingMinutes: walking, stayMinutes: stay, totalMinutes: walking + stay }
}
