import { apiClient } from '@/api/client'
import { getCurrentUser } from '@/lib/auth'

// Best-effort background push to the backend, for logged-in users only (DB
// rows are keyed by username — guests have nothing to sync). No-ops if
// VITE_API_BASE_URL isn't set, and silently warns on failure instead of
// throwing: these endpoints don't exist yet (see DB_INTEGRATION_REQUEST.md
// at the repo root), so this previews the real wiring without disrupting the
// localStorage-first behavior that already fully works today. Once the
// backend implements a matching endpoint, this starts working with no
// frontend change beyond setting VITE_API_BASE_URL.
async function pushToServer(path: string, payload: unknown): Promise<void> {
  if (!import.meta.env.VITE_API_BASE_URL) return
  const user = await getCurrentUser()
  if (!user) return
  try {
    await apiClient.put(`${path}/${user.id}`, payload)
  } catch (err) {
    console.warn(`[db-sync] failed to sync ${path}:`, err)
  }
}

// For data that only changes on discrete user actions (a click, a completed
// wizard) — low enough frequency that sending immediately is standard and a
// debounce would only add perceived lag. See DB_INTEGRATION_REQUEST.md's
// "즉시 전송" rows (route-progress, persona-preference).
export function syncImmediately(path: string, payload: unknown): void {
  void pushToServer(path, payload)
}

// For data that can change continuously during editing (route-draft drag
// reorder) — sends the latest full payload once activity settles, instead of
// once per intermediate change. `flush()` is for boundary events (page leave,
// tab hidden) so a debounce in flight isn't lost.
export function createDebouncedSync(path: string, delayMs = 1500) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: unknown = null

  function flush(): void {
    if (timer) clearTimeout(timer)
    timer = null
    if (pending !== null) void pushToServer(path, pending)
    pending = null
  }

  function schedule(payload: unknown): void {
    pending = payload
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  return { schedule, flush }
}
