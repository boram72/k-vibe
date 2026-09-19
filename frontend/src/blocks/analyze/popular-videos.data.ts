import type { Locale } from '@/i18n'
import type { AnalysisPlace, AnalysisResult } from '@/api/analyze'

interface PopularVideo {
  videoId: string
  labelKey: string
}

// 한국관광공사 공식 채널(@VISITKOREA)의 "Feel the Rhythm of Korea" 시리즈 —
// 개인 크리에이터 영상 대신 이걸 쓴 이유: (1) 정부 공식 홍보 채널이라 저작권
// 문제가 사실상 없고, (2) 도시별로 실제 랜드마크가 뚜렷하게 나와서 SNS
// 분석기로 분석했을 때 장소가 잘 잡힐 가능성이 높다(사용자 요청).
export const POPULAR_VIDEOS: PopularVideo[] = [
  { videoId: '3P1CnWI62Ik', labelKey: 'analyze.popular_video_seoul' },
  { videoId: 'xLD8oWRmlAE', labelKey: 'analyze.popular_video_busan' },
  { videoId: 'dqkfpKJw348', labelKey: 'analyze.popular_video_gyeongju' },
  { videoId: 'gux_pyEIcUY', labelKey: 'analyze.popular_video_jeju' },
  { videoId: 'ZRD2pqmHuK0', labelKey: 'analyze.popular_video_yeosu' },
  { videoId: '9VbMfTXkUCI', labelKey: 'analyze.popular_video_mokpo' },
]

// 이 6개 영상은 무료 AI 분석 토큰을 아끼기 위해 실제로 분석 API를 호출하지
// 않고, 여기 저장된 데이터를 "분석 중..." 프로그레스바(analyze-store.ts의
// startCannedAnalysis)를 몇 초 보여준 뒤 결과인 것처럼 반환한다(사용자 요청,
// 2026-09). 직접 URL을 붙여넣는 경우는 이 데이터를 타지 않고 그대로 실제
// /analyze를 호출한다 — AnalyzePage.tsx의 runAnalysis에서 videoId가 아래
// CANNED_ANALYSIS에 있을 때만 이 경로를 탄다.
const REASON_TEXT: Record<Locale, string> = {
  ko: '한국관광공사 영상에 등장한 대표 스팟으로, 방문객들이 즐겨 찾는 곳입니다.',
  en: 'A signature spot featured in the Korea Tourism Organization video, popular with visitors.',
  ja: '韓国観光公社の映像に登場した代表スポットで、観光客に人気があります。',
  zh: '出现在韩国观光公社视频中的代表景点，深受游客喜爱。',
}

interface CannedPlaceSeed {
  name: Record<Locale, string>
  lat: number
  lng: number
  confidence: number
}

interface CannedCity {
  title: Record<Locale, string>
  places: CannedPlaceSeed[]
}

// 2026-09: 아래 6개 도시의 장소 목록은 더 이상 손으로 지어낸 랜드마크가 아니라,
// 사용자가 실제 k-vibe 웹에서 이 영상 6개를 진짜 "스팟 분석"으로 돌려서 받은
// 결과(Groq/Gemini 자막·영상분석)를 그대로 옮긴 것이다. 좌표는 백엔드와 동일하게
// Kakao 로컬 키워드검색으로 붙였고(장소명만 AI가 추출, 좌표는 별도), confidence도
// 백엔드의 _DEFAULT_CONFIDENCE(0.75) 고정값과 동일하게 맞춰 실제 파이프라인
// 결과와 성격이 다르지 않게 했다. "대룡원"으로 추출된 경주 장소는 Kakao 검색
// 결과가 없어 실제 장소인 "대릉원"(경주 대릉원, 신라 고분군)의 오타로 판단해
// 정정했다.
const CANNED_CITIES: Record<string, CannedCity> = {
  // Seoul
  '3P1CnWI62Ik': {
    title: {
      ko: '서울 인기 스팟 미리보기',
      en: 'Seoul popular spot preview',
      ja: 'ソウル人気スポットプレビュー',
      zh: '首尔人气景点预览',
    },
    places: [
      { name: { ko: '청와대', en: 'Cheongwadae (The Blue House)', ja: '青瓦台', zh: '青瓦台' }, lat: 37.582676, lng: 126.973234, confidence: 0.75 },
      { name: { ko: '리움미술관', en: 'Leeum Museum of Art', ja: 'リウム美術館', zh: '三星美术馆(Leeum)' }, lat: 37.538337, lng: 126.999117, confidence: 0.75 },
      { name: { ko: '덕수궁', en: 'Deoksugung Palace', ja: '徳寿宮', zh: '德寿宫' }, lat: 37.565564, lng: 126.974895, confidence: 0.75 },
      { name: { ko: '자하문터널', en: 'Jahamun Tunnel', ja: 'チャハムントンネル', zh: '紫霞门隧道' }, lat: 37.591094, lng: 126.965296, confidence: 0.75 },
      { name: { ko: '동대문디자인플라자', en: 'Dongdaemun Design Plaza (DDP)', ja: '東大門デザインプラザ(DDP)', zh: '东大门设计广场(DDP)' }, lat: 37.567184, lng: 127.009911, confidence: 0.75 },
    ],
  },
  // Busan
  xLD8oWRmlAE: {
    title: {
      ko: '부산 인기 스팟 미리보기',
      en: 'Busan popular spot preview',
      ja: '釜山人気スポットプレビュー',
      zh: '釜山人气景点预览',
    },
    places: [
      { name: { ko: '감천문화마을', en: 'Gamcheon Culture Village', ja: '甘川文化村', zh: '甘川文化村' }, lat: 35.097409, lng: 129.010561, confidence: 0.75 },
      { name: { ko: '부산역', en: 'Busan Station', ja: '釜山駅', zh: '釜山站' }, lat: 35.115203, lng: 129.041550, confidence: 0.75 },
      { name: { ko: '보수동 책방골목', en: 'Bosu-dong Book Street', ja: '宝水洞本の路地', zh: '宝水洞书店街' }, lat: 35.103367, lng: 129.026657, confidence: 0.75 },
      { name: { ko: '해동용궁사', en: 'Haedong Yonggungsa Temple', ja: '海東龍宮寺', zh: '海东龙宫寺' }, lat: 35.188403, lng: 129.223143, confidence: 0.75 },
      { name: { ko: '광안리해수욕장', en: 'Gwangalli Beach', ja: '広安里海水浴場', zh: '广安里海水浴场' }, lat: 35.153193, lng: 129.118976, confidence: 0.75 },
    ],
  },
  // Gyeongju & Andong
  dqkfpKJw348: {
    title: {
      ko: '경주·안동 인기 스팟 미리보기',
      en: 'Gyeongju & Andong popular spot preview',
      ja: '慶州・安東人気スポットプレビュー',
      zh: '庆州·安东人气景点预览',
    },
    places: [
      { name: { ko: '불국사', en: 'Bulguksa Temple', ja: '仏国寺', zh: '佛国寺' }, lat: 35.789915, lng: 129.331843, confidence: 0.75 },
      { name: { ko: '월영교', en: 'Woryeonggyo Bridge', ja: 'ウォルヨンギョ(月映橋)', zh: '月映桥' }, lat: 36.576612, lng: 128.760926, confidence: 0.75 },
      { name: { ko: '첨성대', en: 'Cheomseongdae Observatory', ja: '瞻星台', zh: '瞻星台' }, lat: 35.834715, lng: 129.219000, confidence: 0.75 },
      { name: { ko: '대릉원', en: 'Daereungwon Tomb Complex', ja: '大陵苑', zh: '大陵苑' }, lat: 35.838191, lng: 129.213334, confidence: 0.75 },
      { name: { ko: '황룡원', en: 'Hwangnyongwon', ja: 'ファンリョンウォン(皇龍苑)', zh: '皇龙苑' }, lat: 35.836879, lng: 129.290048, confidence: 0.75 },
      { name: { ko: '병산서원', en: 'Byeongsan Seowon', ja: '屏山書院', zh: '屏山书院' }, lat: 36.540575, lng: 128.552625, confidence: 0.75 },
    ],
  },
  // Jeju
  gux_pyEIcUY: {
    title: {
      ko: '제주 인기 스팟 미리보기',
      en: 'Jeju popular spot preview',
      ja: '済州人気スポットプレビュー',
      zh: '济州人气景点预览',
    },
    places: [
      { name: { ko: '사려니숲길', en: 'Saryeoni Forest Trail', ja: 'サリョニの森道', zh: '思连伊林荫道' }, lat: 33.422033, lng: 126.626497, confidence: 0.75 },
      { name: { ko: '제주도립미술관', en: 'Jeju Museum of Art', ja: '済州道立美術館', zh: '济州道立美术馆' }, lat: 33.452585, lng: 126.489645, confidence: 0.75 },
      { name: { ko: '성산일출봉', en: 'Seongsan Ilchulbong', ja: '城山日出峰', zh: '城山日出峰' }, lat: 33.459135, lng: 126.940538, confidence: 0.75 },
      { name: { ko: '황우지해안', en: 'Hwangujiyeondae Coast', ja: 'ファンウジ海岸', zh: '皇牛地海岸' }, lat: 33.241467, lng: 126.550528, confidence: 0.75 },
      { name: { ko: '정방폭포', en: 'Jeongbang Waterfall', ja: '正房瀑布', zh: '正房瀑布' }, lat: 33.244909, lng: 126.571526, confidence: 0.75 },
      { name: { ko: '더스위트호텔 제주', en: 'The Suite Hotel Jeju', ja: 'ザ・スイートホテル済州', zh: '苏维特酒店济州' }, lat: 33.249045, lng: 126.408429, confidence: 0.75 },
    ],
  },
  // Yeosu
  ZRD2pqmHuK0: {
    title: {
      ko: '여수 인기 스팟 미리보기',
      en: 'Yeosu popular spot preview',
      ja: '麗水人気スポットプレビュー',
      zh: '丽水人气景点预览',
    },
    places: [
      { name: { ko: '신기항', en: 'Singi Harbor', ja: 'シンギ港', zh: '新基港' }, lat: 34.599281, lng: 127.743511, confidence: 0.75 },
      { name: { ko: '무슬목', en: 'Museulmok Beach', ja: 'ムスルモク海水浴場', zh: '无瑟项海滩' }, lat: 34.683256, lng: 127.776425, confidence: 0.75 },
      { name: { ko: '화태대교', en: 'Hwatae Bridge', ja: 'ファテ大橋', zh: '华太大桥' }, lat: 34.599406, lng: 127.735691, confidence: 0.75 },
      { name: { ko: '이순신광장', en: 'Yi Sun-sin Square', ja: '李舜臣広場', zh: '李舜臣广场' }, lat: 34.739448, lng: 127.736050, confidence: 0.75 },
      { name: { ko: '오동도', en: 'Odongdo Island', ja: '梧桐島', zh: '梧桐岛' }, lat: 34.744598, lng: 127.766289, confidence: 0.75 },
    ],
  },
  // Mokpo
  '9VbMfTXkUCI': {
    title: {
      ko: '목포 인기 스팟 미리보기',
      en: 'Mokpo popular spot preview',
      ja: '木浦人気スポットプレビュー',
      zh: '木浦人气景点预览',
    },
    places: [
      { name: { ko: '청호시장', en: 'Cheongho Market', ja: 'チョンホ市場', zh: '青湖市场' }, lat: 34.815834, lng: 126.424212, confidence: 0.75 },
      { name: { ko: '목포대교', en: 'Mokpo Bridge', ja: '木浦大橋', zh: '木浦大桥' }, lat: 34.785103, lng: 126.354654, confidence: 0.75 },
      { name: { ko: '목포항 포차', en: 'Mokpo Port Food Tents', ja: '木浦港ポチャ通り', zh: '木浦港帐篷酒馆' }, lat: 34.804542, lng: 126.368670, confidence: 0.75 },
      { name: { ko: '퍼플섬', en: 'Purple Island', ja: 'パープル島', zh: '紫色岛' }, lat: 34.707283, lng: 126.129092, confidence: 0.75 },
    ],
  },
}

function buildPlaces(seeds: CannedPlaceSeed[], locale: Locale): AnalysisPlace[] {
  return seeds.map((seed) => ({
    name: seed.name[locale],
    lat: seed.lat,
    lng: seed.lng,
    confidence: seed.confidence,
    reason: REASON_TEXT[locale],
  }))
}

export function isCannedAnalysisVideo(videoId: string): boolean {
  return videoId in CANNED_CITIES
}

export function getCannedAnalysis(videoId: string, locale: Locale): Omit<AnalysisResult, 'videoId' | 'source'> | null {
  const city = CANNED_CITIES[videoId]
  if (!city) return null
  return { title: city.title[locale], places: buildPlaces(city.places, locale) }
}
