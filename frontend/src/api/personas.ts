import type { Locale } from '@/i18n'
import { apiClient, withFallback } from '@/api/client'
import { scheduleStops, type RouteStop, type ScheduledRoute } from '@/lib/route-timing'

export interface KContentPersona {
  id: string
  label: string
  description: string
  badge: string
  profileImg: string
  routeCnt: number
}

type LocalizedText = Record<'ko' | 'en' | 'ja' | 'zh', string>

interface PersonaFallback {
  id: string
  label: LocalizedText
  description: LocalizedText
  badge: string
  profileImg: string
  locations: StopTemplate[]
}

type StopTemplate = Omit<RouteStop, 'startTime'>

const PERSONA_FALLBACKS: PersonaFallback[] = [
  {
    id: 'BTS뷔',
    label: { ko: 'BTS뷔', en: 'BTS V', ja: 'BTS V', zh: 'BTS V' },
    badge: 'V',
    profileImg:
      'https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcSVGz6JfFl0_D1sD_25wk6lOy1prLYqWgs4FAAwMI3ku4UQeioKWq8ncDWmFf3mkHevabw3qu7GWtnA8uU',
    description: {
      ko: '전망, 궁궐, 익선동·성수 감성을 잇는 서울 하루 성지순례 코스.',
      en: 'A Seoul day route linking views, palace scenery, Ikseon-dong, and Seongsu.',
      ja: '展望、宮殿、益善洞・聖水の雰囲気をつなぐソウル1日コース。',
      zh: '串联观景、宫殿、益善洞与圣水氛围的首尔一日路线。',
    },
    locations: [
      {
        id: 'BTS뷔-남산타워',
        name: '남산타워',
        category: 'View',
        address: '서울 용산구 · 4.4 · 10:00~23:00',
        crowdLevel: 'high',
        lat: 37.5512,
        lng: 126.9882,
        stayMinutes: 70,
        description: '서울 전경과 야경을 한눈에 담을 수 있는 대표 전망 명소예요.',
        tags: ['전망', '야경', '포토'],
      },
      {
        id: 'BTS뷔-경복궁',
        name: '경복궁',
        category: 'Culture',
        address: '서울 종로구 · 4.3 · 09:00~18:00',
        crowdLevel: 'high',
        lat: 37.5796,
        lng: 126.977,
        stayMinutes: 80,
        description: '한복 사진과 전통 궁궐 동선이 잘 어울리는 서울 대표 문화 명소예요.',
        tags: ['궁궐', '한복', '전통'],
      },
      {
        id: 'BTS뷔-익선동 온천집',
        name: '익선동 온천집',
        category: 'Food',
        address: '서울 종로구 · 4.3 · 11:30~21:30',
        crowdLevel: 'mid',
        lat: 37.573,
        lng: 126.9892,
        stayMinutes: 65,
        description: '익선동 한옥 골목의 분위기와 식사 동선을 함께 잡기 좋은 맛집 스팟이에요.',
        tags: ['맛집', '한옥', '익선동'],
      },
      {
        id: 'BTS뷔-성수동 대림창고',
        name: '성수동 대림창고',
        category: 'Cafe',
        address: '서울 성동구 · 4.0 · 10:00~22:00',
        crowdLevel: 'mid',
        lat: 37.5419,
        lng: 127.0545,
        stayMinutes: 60,
        description: '성수의 산업 감성과 카페 문화가 만나는 대표 포토 스팟이에요.',
        tags: ['카페', '성수', '포토'],
      },
      {
        id: 'BTS뷔-뚝섬한강공원',
        name: '뚝섬한강공원',
        category: 'River',
        address: '서울 광진구 · 4.3 · 00:00~24:00',
        crowdLevel: 'mid',
        lat: 37.5297,
        lng: 127.069,
        stayMinutes: 65,
        description: '한강 피크닉과 노을 사진을 곁들이기 좋은 여유로운 마무리 코스예요.',
        tags: ['한강', '피크닉', '노을'],
      },
    ],
  },
  {
    id: '아이유',
    label: { ko: '아이유', en: 'IU', ja: 'IU', zh: 'IU' },
    badge: 'IU',
    profileImg:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFBRYXIQjeINFYnz5HUcwDGXcthsJQGrZuSzEgZ3NyJaX-4aCiiWz1HZwRUz0EP68jOn4xQXoxhUFBhAmrHlsMx8cGHYJnZMSdARrH0GM&s=10',
    description: {
      ko: '서촌 한식, 감성 카페, 벽화마을과 삼청동을 연결한 차분한 감성 코스.',
      en: 'A mellow Seoul route through Seochon food, cafes, murals, and Samcheong-dong.',
      ja: '西村の韓国料理、感性カフェ、壁画村と三清洞を結ぶ落ち着いたコース。',
      zh: '连接西村韩餐、氛围咖啡、壁画村与三清洞的舒缓路线。',
    },
    locations: [
      {
        id: '아이유-체부동잔치집',
        name: '체부동잔치집',
        category: 'Food',
        address: '서울 종로구 · 4.5 · 11:00~22:30',
        crowdLevel: 'mid',
        lat: 37.5787,
        lng: 126.9708,
        stayMinutes: 60,
        description: '서촌 산책 전후로 들르기 좋은 든든한 한식 맛집이에요.',
        tags: ['한식', '서촌', '식사'],
      },
      {
        id: '아이유-도산공원',
        name: '도산공원',
        category: 'Park',
        address: '서울 강남구 · 4.3 · 06:00~22:00',
        crowdLevel: 'mid',
        lat: 37.5247,
        lng: 127.0355,
        stayMinutes: 60,
        description: '압구정·청담 동선 사이에서 쉬어가기 좋은 세련된 공원 스팟이에요.',
        tags: ['공원', '강남', '산책'],
      },
      {
        id: '아이유-이화동 벽화마을',
        name: '이화동 벽화마을',
        category: 'Photo',
        address: '서울 종로구 · 3.9 · 00:00~24:00',
        crowdLevel: 'mid',
        lat: 37.5804,
        lng: 127.0074,
        stayMinutes: 55,
        description: '언덕 골목과 벽화가 이어지는 감성 산책·사진 코스예요.',
        tags: ['벽화', '산책', '포토'],
      },
      {
        id: '아이유-청수당',
        name: '청수당',
        category: 'Cafe',
        address: '서울 종로구 · 4.3 · 10:30~21:00',
        crowdLevel: 'high',
        lat: 37.5737,
        lng: 126.9894,
        stayMinutes: 55,
        description: '익선동의 정원 감성과 디저트를 함께 즐길 수 있는 인기 카페예요.',
        tags: ['카페', '디저트', '익선동'],
      },
      {
        id: '아이유-삼청동수제비',
        name: '삼청동수제비',
        category: 'Food',
        address: '서울 종로구 · 4.2 · 11:00~20:00',
        crowdLevel: 'mid',
        lat: 37.584,
        lng: 126.9819,
        stayMinutes: 60,
        description: '삼청동 골목 산책과 함께 묶기 좋은 대표 한식 식사 코스예요.',
        tags: ['수제비', '한식', '삼청동'],
      },
    ],
  },
  {
    id: '제니',
    label: { ko: '제니', en: 'Jennie', ja: 'Jennie', zh: 'Jennie' },
    badge: 'JEN',
    profileImg: 'https://i.namu.wiki/i/enCUBDXgjFR3bLBFx9M3hpGtEq1AYjNPU75fDxYtkEHPoZG1MTORb7haPMG0lZKHMQpHF7CFm3K8krWZTTA5zw.webp',
    description: {
      ko: '청담·압구정 쇼핑, 도산공원, 한남 디저트와 식사를 잇는 스타일 코스.',
      en: 'A style-led route through Cheongdam, Apgujeong, Dosan Park, Hannam dessert, and dinner.',
      ja: '清潭・狎鴎亭のショッピング、島山公園、漢南のデザートと食事をつなぐスタイルコース。',
      zh: '串联清潭、狎鸥亭购物、岛山公园、汉南甜点与餐厅的时尚路线。',
    },
    locations: [
      {
        id: '제니-10 꼬르소꼬모 서울',
        name: '10 꼬르소꼬모 서울',
        category: 'Shopping',
        address: '서울 강남구 · 4.2 · 12:00~22:00',
        crowdLevel: 'mid',
        lat: 37.5249,
        lng: 127.0411,
        stayMinutes: 60,
        description: '패션·라이프스타일 감성을 한 번에 담기 좋은 청담 쇼핑 스팟이에요.',
        tags: ['패션', '청담', '쇼핑'],
      },
      {
        id: '제니-나이키 압구정',
        name: '나이키 압구정',
        category: 'Shopping',
        address: '서울 강남구 · 4.5 · 10:30~21:30',
        crowdLevel: 'mid',
        lat: 37.5272,
        lng: 127.0389,
        stayMinutes: 45,
        description: '압구정 패션 동선에 넣기 좋은 스포츠·스트리트 무드의 쇼핑 스팟이에요.',
        tags: ['스포츠', '패션', '압구정'],
      },
      {
        id: '제니-도산공원',
        name: '도산공원',
        category: 'Park',
        address: '서울 강남구 · 4.3 · 06:00~22:00',
        crowdLevel: 'mid',
        lat: 37.5247,
        lng: 127.0355,
        stayMinutes: 60,
        description: '압구정·청담 동선 사이에서 쉬어가기 좋은 세련된 공원 스팟이에요.',
        tags: ['공원', '강남', '산책'],
      },
      {
        id: '제니-패션5 한남점',
        name: '패션5 한남점',
        category: 'Dessert',
        address: '서울 용산구 · 4.3 · 07:30~22:00',
        crowdLevel: 'high',
        lat: 37.5346,
        lng: 127.0002,
        stayMinutes: 55,
        description: '디저트와 베이커리를 중심으로 한남동 감성을 쉬어가기 좋은 곳이에요.',
        tags: ['디저트', '한남', '베이커리'],
      },
      {
        id: '제니-장진우식당',
        name: '장진우식당',
        category: 'Food',
        address: '서울 용산구 · 4.1 · 평일 17:00~22:00 / 주말 12:00~22:00',
        crowdLevel: 'mid',
        lat: 37.5402,
        lng: 126.9918,
        stayMinutes: 70,
        description: '한남·이태원 저녁 동선에 어울리는 분위기 있는 식사 스팟이에요.',
        tags: ['식사', '한남', '이태원'],
      },
    ],
  },
  {
    id: '장원영',
    label: { ko: '장원영', en: 'Jang Wonyoung', ja: 'Jang Wonyoung', zh: 'Jang Wonyoung' },
    badge: 'WY',
    profileImg:
      'https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQd_jr6bqPrC7F-u59fAzuyur7EOtQjIS2TQE4uQwDZi9TK1g5NVocxR8FeOl1bAHHWBSAsxYmdF2FmNUY',
    description: {
      ko: '잠실 전망과 호수, 성수 라이프스타일, 반포 야경을 잇는 화사한 도시 코스.',
      en: 'A bright city route through Jamsil views, Seongsu lifestyle spots, and Banpo night scenery.',
      ja: '蚕室の展望と湖、聖水のライフスタイル、盤浦の夜景をつなぐ明るい都市コース。',
      zh: '连接蚕室展望与湖景、圣水生活方式、盘浦夜景的明亮城市路线。',
    },
    locations: [
      {
        id: '장원영-서울스카이',
        name: '서울스카이',
        category: 'View',
        address: '서울 송파구 · 4.5 · 10:30~22:00',
        crowdLevel: 'high',
        lat: 37.5125,
        lng: 127.1025,
        stayMinutes: 80,
        description: '잠실의 높은 전망과 도시 스케일을 한 번에 느낄 수 있는 코스예요.',
        tags: ['전망', '잠실', '스카이'],
      },
      {
        id: '장원영-석촌호수',
        name: '석촌호수',
        category: 'Lake',
        address: '서울 송파구 · 4.4 · 00:00~24:00',
        crowdLevel: 'mid',
        lat: 37.5083,
        lng: 127.1041,
        stayMinutes: 55,
        description: '잠실 일정 사이에 산책과 사진을 넣기 좋은 호수 둘레길이에요.',
        tags: ['호수', '산책', '잠실'],
      },
      {
        id: '장원영-성수연방',
        name: '성수연방',
        category: 'Lifestyle',
        address: '서울 성동구 · 4.2 · 10:00~22:00',
        crowdLevel: 'mid',
        lat: 37.543,
        lng: 127.0547,
        stayMinutes: 60,
        description: '성수의 라이프스타일 매장과 카페를 한 번에 둘러보기 좋은 복합 공간이에요.',
        tags: ['성수', '라이프스타일', '카페'],
      },
      {
        id: '장원영-반포 세빛섬',
        name: '반포 세빛섬',
        category: 'River',
        address: '서울 서초구 · 4.2 · 10:00~23:00',
        crowdLevel: 'mid',
        lat: 37.5126,
        lng: 126.9957,
        stayMinutes: 65,
        description: '한강 야경과 반포 동선을 함께 잡기 좋은 수변 랜드마크예요.',
        tags: ['한강', '야경', '반포'],
      },
    ],
  },
]

function pickText(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en
}

function toPersona(persona: PersonaFallback, locale: Locale): KContentPersona {
  return {
    id: persona.id,
    label: pickText(persona.label, locale),
    description: pickText(persona.description, locale),
    badge: persona.badge,
    profileImg: persona.profileImg,
    routeCnt: persona.locations.length,
  }
}

function buildFallbackRoute(personaId: string, startTime: string): ScheduledRoute {
  const persona = PERSONA_FALLBACKS.find((item) => item.id === personaId) ?? PERSONA_FALLBACKS[0]
  return scheduleStops(persona.locations, startTime)
}

export async function fetchKContentPersonas(locale: Locale): Promise<KContentPersona[]> {
  return withFallback(
    async () => (await apiClient.get<KContentPersona[]>('/personas', { params: { locale } })).data,
    () => PERSONA_FALLBACKS.map((persona) => toPersona(persona, locale)),
  )
}

export async function fetchKContentPersonaRoute(
  personaId: string,
  startTime: string,
  locale: Locale,
): Promise<ScheduledRoute> {
  return withFallback(
    async () =>
      (
        await apiClient.post<ScheduledRoute>('/routes/generate', {
          persona_id: personaId,
          start_time: startTime,
          locale,
        })
      ).data,
    () => buildFallbackRoute(personaId, startTime),
  )
}
