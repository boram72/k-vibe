// 2026-09 — 위치기반서비스사업자 등록 없이 배포하기 위한 우회(plan.md 6번).
// 실측 GPS를 그대로 백엔드에 보내는 대신, "관할 정부처"(시청/군청/구청)처럼
// 다수 사용자가 공유하는 고정된 공공 지점으로 뭉뚱그려서 보낸다. 행정구역
// 판별(coord2RegionCode)과 정부처 좌표 검색(keywordSearch) 둘 다 브라우저에서
// 카카오 서버로 직접 호출하는 클라이언트사이드 API만 사용 — 우리 백엔드는
// 실측 GPS를 전혀 보지 못한다.

interface Coordinates {
  lat: number
  lng: number
}

// 특별시/광역시/특별자치시는 관할 정부처가 region_1depth(시 자체) 단위라
// "서울특별시청"처럼 1depth 이름 그대로 검색해야 한다. 그 외(도/특별자치도)는
// region_2depth(시/군/구) 단위 관할 정부처를 찾는다 — 사용자 확정 예시
// ("서울 → 서울시청", "창원 → 창원시청")와 동일한 기준.
const METRO_REGION_NAMES = new Set([
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
])

function buildOfficeQuery(region: kakao.maps.services.RegionCode): string {
  if (METRO_REGION_NAMES.has(region.region_1depth_name)) return `${region.region_1depth_name}청`

  // 창원시/청주시/전주시처럼 내부에 구가 있는 통합시는 region_2depth_name이
  // "창원시 성산구"처럼 시+구가 합쳐진 문자열로 나온다(실측 확인) — 그대로
  // 쓰면 구청을 찾아버리므로, 앞 토큰(시/군 단위)만 취해 항상 시/군청으로
  // 랜딩한다(구 단위보다 굵은 granularity가 목표 — plan.md 6번 고려사항 2).
  const cityOrCounty = region.region_2depth_name.split(' ')[0]
  return `${cityOrCounty}청`
}

function reverseGeocodeRegion(coords: Coordinates): Promise<kakao.maps.services.RegionCode | null> {
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.coord2RegionCode(coords.lng, coords.lat, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || result.length === 0) {
        resolve(null)
        return
      }
      resolve(result.find((r) => r.region_type === 'H') ?? result[0])
    })
  })
}

function findOfficeCoords(query: string): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places()
    places.keywordSearch(query, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || result.length === 0) {
        resolve(null)
        return
      }
      resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
    })
  })
}

function isKakaoServicesReady(): boolean {
  return typeof kakao !== 'undefined' && Boolean(kakao.maps?.services)
}

// 지도 페이지 진입 직후엔 GPS 요청(짧으면 즉시 응답)이 카카오 SDK 스크립트
// 로딩(비동기, 별도 컴포넌트가 관리)보다 먼저 끝날 수 있다 — 이전에 검색
// 버튼에서 겪었던 것과 같은 종류의 타이밍 문제. SDK가 뜰 때까지 잠깐
// 재시도한다(최대 5초, 100ms 간격) — 그래도 안 뜨면 정말 로드 실패한 것이라
// 아래 resolveAdminOfficeCoords가 null을 반환하고, 호출부가 서울시청으로
// 폴백한다(다른 실패 사유들과 동일한 폴백 체인 — 새 폴백 경로 아님).
function waitForKakaoServices(maxWaitMs = 5000, intervalMs = 100): Promise<boolean> {
  if (isKakaoServicesReady()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const timer = setInterval(() => {
      if (isKakaoServicesReady()) {
        clearInterval(timer)
        resolve(true)
      } else if (Date.now() - startedAt >= maxWaitMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, intervalMs)
  })
}

// 실패(SDK 미로드/역지오코딩 실패/정부처 검색 실패) 시 null — 호출부가
// **절대 실측 GPS로 폴백하면 안 됨**(그러면 이 우회 자체가 무의미해짐).
// 대신 서울시청 같은 고정값(SEOUL_CENTER)처럼 실패해도 안전한 값으로
// 대체해야 한다 — 정확도보단 "개인 위치가 아님"을 항상 보장하는 게 우선.
export async function resolveAdminOfficeCoords(coords: Coordinates): Promise<Coordinates | null> {
  const ready = await waitForKakaoServices()
  if (!ready) return null

  const region = await reverseGeocodeRegion(coords)
  if (!region) return null

  return findOfficeCoords(buildOfficeQuery(region))
}
