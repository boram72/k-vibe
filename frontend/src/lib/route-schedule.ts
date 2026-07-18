import { haversineKm, walkingMinutes } from '@/lib/haversine'
import type { RouteStop } from '@/lib/route-draft'

export const DEFAULT_STAY_MINUTES = 60
const DEFAULT_START_TIME = '10:00'
const TRANSIT_HINT_DISTANCE_M = 2500
const TRANSIT_AVERAGE_KMH = 24
const TRANSIT_BUFFER_MINUTES = 8

export interface ScheduledStop {
  stop: RouteStop
  date: string // ISO "YYYY-MM-DD", always resolved (anchor or computed)
  startTime: string // "HH:MM", always resolved
  dayNumber: number // 1-indexed, increments whenever the date changes
  showDayDivider: boolean // true for the first stop and whenever the date changes from the previous stop
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function toDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Works entirely in local wall-clock time (avoids toISOString's UTC shift,
// which would corrupt the date when the local timezone offset isn't 0).
// Date overflow (e.g. minutes pushing past midnight) rolls over naturally
// via the native Date setHours normalization.
function addMinutes(dateIso: string, timeHHMM: string, minutesToAdd: number): { date: string; time: string } {
  const [hours, minutes] = timeHHMM.split(':').map(Number)
  const base = new Date(`${dateIso}T00:00:00`)
  base.setHours(hours, minutes + minutesToAdd, 0, 0)
  return { date: toDateIso(base), time: toTimeHHMM(base) }
}

export type TravelMode = 'walk' | 'transit'

function estimateTransitMinutes(distanceKm: number): number {
  return Math.max(8, Math.round((distanceKm / TRANSIT_AVERAGE_KMH) * 60) + TRANSIT_BUFFER_MINUTES)
}

// Distance-based walk/transit heuristic (no real transit data, consistent
// with the rest of this app's mock-data approach) — ported from hslee.
// Shared by scheduleRoute (so each stop's computed arrival time matches) and
// calculateRouteLegs (so the displayed "Transit Xmin" label matches it too).
function computeLegTravel(distanceKm: number): { mode: TravelMode; minutes: number } {
  const distanceM = distanceKm * 1000
  if (distanceM >= TRANSIT_HINT_DISTANCE_M) {
    return { mode: 'transit', minutes: estimateTransitMinutes(distanceKm) }
  }
  return { mode: 'walk', minutes: walkingMinutes(distanceKm) }
}

/**
 * Walks the stop list in order, resolving a date+startTime for every stop.
 * Anchors (stop.isAnchor with stop.date/startTime set) are used as-is and
 * reset the running cursor; non-anchor stops cascade forward from the
 * previous stop's resolved date/time + that stop's stayMinutes (falls back
 * to `defaultStayMinutes`, user-adjustable in RoutePage) + travel time to
 * this stop (walk or transit, same heuristic as calculateRouteLegs so the
 * computed times match the displayed leg durations). Crossing midnight
 * automatically advances the date.
 */
export function scheduleRoute(stops: RouteStop[], defaultStayMinutes = DEFAULT_STAY_MINUTES): ScheduledStop[] {
  const result: ScheduledStop[] = []
  let cursorDate = todayIso()
  let cursorTime = DEFAULT_START_TIME
  let prevStop: RouteStop | null = null
  let prevDate: string | null = null
  let dayNumber = 0

  for (const stop of stops) {
    let date: string
    let time: string

    if (stop.isAnchor && stop.date && stop.startTime) {
      date = stop.date
      time = stop.startTime
    } else if (prevStop) {
      const stayMinutes = prevStop.stayMinutes ?? defaultStayMinutes
      const travel = computeLegTravel(haversineKm(prevStop.lat, prevStop.lng, stop.lat, stop.lng))
      const advanced = addMinutes(cursorDate, cursorTime, stayMinutes + travel.minutes)
      date = advanced.date
      time = advanced.time
    } else {
      date = cursorDate
      time = cursorTime
    }

    const isNewDay = prevDate === null || date !== prevDate
    if (isNewDay) dayNumber += 1

    result.push({ stop, date, startTime: time, dayNumber, showDayDivider: isNewDay })

    cursorDate = date
    cursorTime = time
    prevStop = stop
    prevDate = date
  }

  return result
}

export interface RouteLeg {
  fromStopId: string
  toStopId: string
  mode: TravelMode
  distanceM: number
  travelMinutes: number
}

export function calculateRouteLegs(stops: Pick<RouteStop, 'id' | 'lat' | 'lng'>[]): RouteLeg[] {
  const legs: RouteLeg[] = []

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i]
    const to = stops[i + 1]
    const distanceKm = haversineKm(from.lat, from.lng, to.lat, to.lng)
    const travel = computeLegTravel(distanceKm)

    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      mode: travel.mode,
      distanceM: Math.round(distanceKm * 1000),
      travelMinutes: travel.minutes,
    })
  }

  return legs
}
