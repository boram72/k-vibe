import { getCurrentUser } from '@/lib/auth'
import { syncImmediately } from '@/lib/db-sync'
import type { Place } from '@/types/place'

const STORAGE_PREFIX = 'k-vibe-saved-places'
const GUEST_KEY = `${STORAGE_PREFIX}:guest`

function bucketKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : GUEST_KEY
}

function readBucket(key: string): Place[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Place[]) : []
  } catch {
    return []
  }
}

function writeBucket(key: string, places: Place[]): void {
  localStorage.setItem(key, JSON.stringify(places))
}

async function currentBucketKey(): Promise<string> {
  const user = await getCurrentUser()
  return bucketKey(user?.id ?? null)
}

// Mocked against localStorage for now — saved places are eventually a
// server-side `saved_places` table (Step15). MapPage/HomeFeed/ProfilePage
// never call localStorage directly or import each other; they all share
// this one module + the `['saved-places']` query key, so swapping these
// function bodies for real API calls at Step15 doesn't touch any of them.
//
// Storage is scoped per-identity (`<prefix>:guest` vs `<prefix>:<userId>`) so
// a guest's saves don't leak into another account, and signing out doesn't
// expose the previous account's saves to the next guest session. See
// `mergeGuestSavedPlacesIntoUser` for how a guest's saves get claimed on login.
export async function fetchSavedPlaces(): Promise<Place[]> {
  return readBucket(await currentBucketKey())
}

export async function toggleSavedPlace(place: Place): Promise<Place[]> {
  const key = await currentBucketKey()
  const current = readBucket(key)
  const next = current.some((p) => p.id === place.id)
    ? current.filter((p) => p.id !== place.id)
    : [...current, place]
  writeBucket(key, next)
  // See DB_INTEGRATION_REQUEST.md — a heart tap is a discrete click event
  // (not continuous), so it's pushed immediately, same as route-progress.
  // No-ops for guests (db-sync skips when there's no logged-in user).
  syncImmediately('/saved-places', { places: next })
  return next
}

// Called once right after a successful login. Whatever was saved as a guest
// now "belongs" to this account, so it's merged into the account's bucket
// and the guest bucket is cleared — otherwise logging out would let the next
// guest session see the previous account's saves.
export async function mergeGuestSavedPlacesIntoUser(userId: string): Promise<void> {
  const guestPlaces = readBucket(GUEST_KEY)
  if (guestPlaces.length === 0) return

  const userKey = bucketKey(userId)
  const userPlaces = readBucket(userKey)
  const merged = [...userPlaces, ...guestPlaces.filter((g) => !userPlaces.some((u) => u.id === g.id))]
  writeBucket(userKey, merged)
  localStorage.removeItem(GUEST_KEY)
  syncImmediately('/saved-places', { places: merged })
}
