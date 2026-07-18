import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 8000,
})

// If VITE_API_BASE_URL is unset, skip the network call entirely. If it's set
// but the call fails (no backend yet, timeout, 5xx), fall back the same way —
// this isn't a scaffold to delete once a backend exists, it's the same
// graceful-degradation pattern the real backend itself uses (mock fallback
// even when a real upstream API key is configured but the call times out).
export async function withFallback<T>(realCall: () => Promise<T>, mockFallback: () => T | Promise<T>): Promise<T> {
  if (!import.meta.env.VITE_API_BASE_URL) return mockFallback()
  try {
    return await realCall()
  } catch (err) {
    console.warn('[api] falling back to mock data:', err)
    return mockFallback()
  }
}
