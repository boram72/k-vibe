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
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedStopIds]))
}
