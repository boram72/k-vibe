const STORAGE_KEY = 'k-vibe-last-known-location'

export interface LastKnownLocation {
  lat: number
  lng: number
}

export function readLastKnownLocation(): LastKnownLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastKnownLocation>
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

export function writeLastKnownLocation(location: LastKnownLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
}
