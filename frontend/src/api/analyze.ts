import type { Locale } from '@/i18n'
import { apiClient, withFallback } from '@/api/client'
import { extractVideoId } from '@/lib/youtube'

export interface AnalysisPlace {
  name: string
  lat: number
  lng: number
  confidence: number
  reason: string
}

export interface AnalysisResult {
  videoId: string
  title: string
  places: AnalysisPlace[]
  source: 'mock' | 'worker'
}

const MOCK_ANALYSIS_BY_LOCALE: Record<Locale, Omit<AnalysisResult, 'videoId' | 'source'>> = {
  en: {
    title: 'Local K-content spot preview',
    places: [
      {
        name: 'Seongsu Cafe Street',
        lat: 37.5447,
        lng: 127.0564,
        confidence: 0.92,
        reason: 'Common visual match for cafe streets, pop-up shops, and creator travel clips.',
      },
      {
        name: 'Gyeongbokgung Palace',
        lat: 37.5796,
        lng: 126.977,
        confidence: 0.87,
        reason: 'High-signal Seoul landmark frequently shown in K-drama and tourism videos.',
      },
      {
        name: 'Gwangjang Market Food Alley',
        lat: 37.5701,
        lng: 126.9996,
        confidence: 0.78,
        reason: 'Food-market fallback candidate for snack, street-food, and market-scene content.',
      },
    ],
  },
  ko: {
    title: '로컬 K-콘텐츠 스팟 미리보기',
    places: [
      {
        name: '성수 카페거리',
        lat: 37.5447,
        lng: 127.0564,
        confidence: 0.92,
        reason: '카페 거리, 팝업스토어, 크리에이터 여행 영상에서 자주 보이는 장면과 잘 맞는 후보입니다.',
      },
      {
        name: '경복궁',
        lat: 37.5796,
        lng: 126.977,
        confidence: 0.87,
        reason: 'K-드라마와 관광 영상에 자주 등장하는 서울 대표 랜드마크 후보입니다.',
      },
      {
        name: '광장시장 먹자골목',
        lat: 37.5701,
        lng: 126.9996,
        confidence: 0.78,
        reason: '간식, 길거리 음식, 시장 장면이 포함된 콘텐츠에 어울리는 음식시장 후보입니다.',
      },
    ],
  },
  ja: {
    title: 'ローカルKコンテンツスポットプレビュー',
    places: [
      {
        name: '聖水カフェ通り',
        lat: 37.5447,
        lng: 127.0564,
        confidence: 0.92,
        reason: 'カフェ通り、ポップアップストア、クリエイターの旅行動画でよく見られる場面に合う候補です。',
      },
      {
        name: '景福宮',
        lat: 37.5796,
        lng: 126.977,
        confidence: 0.87,
        reason: 'Kドラマや観光動画にたびたび登場する、ソウルを代表するランドマーク候補です。',
      },
      {
        name: '広蔵市場グルメ通り',
        lat: 37.5701,
        lng: 126.9996,
        confidence: 0.78,
        reason: '軽食、屋台料理、市場のシーンを含むコンテンツに合うフードマーケット候補です。',
      },
    ],
  },
  zh: {
    title: '本地K内容地点预览',
    places: [
      {
        name: '圣水咖啡街',
        lat: 37.5447,
        lng: 127.0564,
        confidence: 0.92,
        reason: '适合作为咖啡街、快闪店和创作者旅行视频中常见画面的候选地点。',
      },
      {
        name: '景福宫',
        lat: 37.5796,
        lng: 126.977,
        confidence: 0.87,
        reason: '常出现在K剧和韩国旅行视频中的首尔代表性地标候选地点。',
      },
      {
        name: '广藏市场美食巷',
        lat: 37.5701,
        lng: 126.9996,
        confidence: 0.78,
        reason: '适合包含小吃、街头美食和市场场景的内容，是食品市场候选地点。',
      },
    ],
  },
}

const MOCK_DELAY_MS = 2200

// Takes the raw URL (not a pre-parsed videoId) to match the real backend's
// contract — it needs the full URL to do its own parsing (and to eventually
// support Instagram, which can't be reduced to a YouTube-style video ID).
export async function fetchAnalysis(url: string, locale: Locale): Promise<AnalysisResult> {
  const videoId = extractVideoId(url) ?? url
  return withFallback(
    async () => (await apiClient.post<AnalysisResult>('/analyze', { youtube_url: url, locale })).data,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
      const localized = MOCK_ANALYSIS_BY_LOCALE[locale]
      return { videoId, title: localized.title, places: localized.places, source: 'mock' }
    },
  )
}
