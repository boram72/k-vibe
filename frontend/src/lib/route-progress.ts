import { syncImmediately } from '@/lib/db-sync'

const STORAGE_KEY = 'k-vibe-route-progress'

export function readRouteProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function saveRouteProgress(completedStopIds: Set<string>) {
  const ids = [...completedStopIds]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  // See DB_INTEGRATION_REQUEST.md — completion toggles are discrete click
  // events (not continuous), so each one is pushed immediately.
  syncImmediately('/route-progress', { completedIds: ids })
}
