import axios from 'axios'

// .env is gitignored (real per-environment values, never committed), so
// relying on VITE_API_BASE_URL alone means every fresh clone needs a .env
// just to reach a local backend. In dev, default to vite.config.ts's /backend
// proxy instead (that file IS committed) — it forwards to localhost:8000, so
// a local backend works with zero .env setup. Production/other deployments
// still need VITE_API_BASE_URL set explicitly via the hosting platform's env
// config (Vercel dashboard etc.), not a committed file.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/backend' : '')

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
})

// If there's no usable base URL, skip the network call entirely. If there is
// one but the call fails (backend down, timeout, 5xx), fall back the same
// way — this isn't a scaffold to delete once a backend exists, it's the same
// graceful-degradation pattern the real backend itself uses (mock fallback
// even when a real upstream API key is configured but the call times out).
export async function withFallback<T>(realCall: () => Promise<T>, mockFallback: () => T | Promise<T>): Promise<T> {
  if (!API_BASE_URL) return mockFallback()
  try {
    return await realCall()
  } catch (err) {
    console.warn('[api] falling back to mock data:', err)
    return mockFallback()
  }
}
