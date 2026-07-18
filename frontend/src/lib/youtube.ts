export type SnsPlatform = 'youtube' | 'instagram' | 'unsupported'

function isHost(hostname: string, baseHost: string) {
  return hostname === baseHost || hostname.endsWith(`.${baseHost}`)
}

/**
 * YouTube URL에서 videoId 추출
 * 지원 형식:
 *   https://www.youtube.com/watch?v=VIDEOID
 *   https://youtu.be/VIDEOID
 *   https://youtube.com/shorts/VIDEOID
 *   https://www.youtube.com/embed/VIDEOID
 */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    if (isHost(u.hostname, 'youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/')
      const idx = parts.findIndex((p) => p === 'shorts' || p === 'embed')
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
    }
    return null
  } catch {
    return null
  }
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}

export function detectSnsPlatform(url: string): SnsPlatform {
  try {
    const { hostname } = new URL(url)
    if (hostname === 'youtu.be' || isHost(hostname, 'youtube.com')) return 'youtube'
    if (isHost(hostname, 'instagram.com')) return 'instagram'
    return 'unsupported'
  } catch {
    return 'unsupported'
  }
}

export function isInstagramUrl(url: string): boolean {
  return detectSnsPlatform(url) === 'instagram'
}

export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}
