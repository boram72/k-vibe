import type { Place, PlaceCategory } from '@/types/place'

// 팀 태스크보드 6번 — "동네검색"(강남/종로 같이 임의의 지역명으로 이동).
// 기존 검색창은 이미 불러온 주변 스팟 목록을 클라이언트에서 텍스트로 필터링할
// 뿐이라 목록에 없는 지역으로는 이동할 수 없었음.
//
// 순수 프론트엔드 기능(카카오 지도 SDK 자체가 이미 프론트에서만 동작) — 백엔드
// 변경 없음. 퍼센트 좌표 폴백 모드(VITE_KAKAO_MAP_KEY 없음)에서는 kakao.maps나
// services가 아예 없으므로 항상 null을 반환한다(호출부가 버튼 자체를 숨김).

interface Coordinates {
  lat: number
  lng: number
}

// 2026-09 대화 중 요청 — 주소/행정구역 매칭(예: "강남")이면 예전처럼 그
// 위치로 바로 이동. 그 외(랜드마크/상호명, 예: "경복궁"/"인천공항")는 더 이상
// 자동으로 첫 결과로 이동하지 않고, 정확도순/거리순 두 후보 목록을 그대로
// 넘긴다 — 호출부가 목록으로 보여주고 사용자가 직접 고르게 한다.
export type KakaoAreaSearchResult =
  | { type: 'address'; center: Coordinates }
  | { type: 'keyword'; relevance: Place[]; distance: Place[] }

// 2026-09 QA — "강남"/"한강"처럼 지역명을 검색하면 원래는 keywordSearch(상호명
// 검색 API)만 썼는데, 그건 "강남"이라는 글자가 들어간 업체(강남역, 강남세브란스
// 병원 등)를 찾아주는 것뿐이라 실제 "강남" 지역 자체의 중심좌표로는 안 갔음
// (버그가 아니라 API 성격 차이 — keywordSearch=상호명 검색, addressSearch=
// 주소/지역명→좌표 변환). 그래서 **먼저 Geocoder.addressSearch()로 주소/지역명
// 매칭을 시도**하고(실제 확인: "강남"→서울 강남구, "종로"→도로명주소, "이태원"
// →동 단위까지 정확히 매칭됨), 실패하면(예: "한강"처럼 지오코더가 못 찾는
// 자연지물, "스타벅스" 같은 순수 상호명) keywordSearch로 폴백한다.
function addressSearch(query: string): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.addressSearch(query, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
      } else {
        resolve(null)
      }
    })
  })
}

// 2026-09 QA 8번 — 원래는 검색 결과의 첫 번째 좌표만 취해서 그 자리를
// 검색중심(searchCenter)으로 승격한 뒤 우리 백엔드 `/places`(TourAPI)를
// 다시 조회했음. 지역/관광지명은 TourAPI에도 대개 있어서 문제없이 동작했지만,
// "스타벅스 종로점"처럼 특정 상호명을 검색하면 그 좌표 근처를 TourAPI로 다시
// 훑어도 TourAPI가 일반 상업시설(그 가게 자체)까지 카탈로그하진 않아서 검색한
// 가게 자체는 결과에 안 나타났다 — 검색 자체가 실패한 게 아니라, 찾은 결과를
// 버리고 다른 데이터소스로 재조회하는 구조가 원인이었음. 카카오 키워드검색
// 결과 자체(상호명/카테고리/좌표 전부 포함)를 그대로 Place로 변환해 돌려주는
// 이 함수로 교체 — TourAPI를 거치지 않고 카카오 응답만으로 상호명 검색 결과를
// 지도에 바로 표시할 수 있다.
const KAKAO_CATEGORY_GROUP_TO_PLACE_CATEGORY: Partial<Record<string, PlaceCategory>> = {
  AT4: 'attraction', // 관광명소
  CT1: 'culture', // 문화시설
  AD5: 'stay', // 숙박
  FD6: 'food', // 음식점
  CE7: 'cafe', // 카페
}

function toPlace(item: kakao.maps.services.PlacesSearchResultItem): Place {
  // 타입 선언상 category_group_code가 배열일 수도 있게 되어 있지만, 실제
  // keywordSearch 응답은 항상 단일 문자열(예: "FD6")로 내려온다.
  const groupCode = Array.isArray(item.category_group_code) ? item.category_group_code[0] : item.category_group_code
  return {
    id: `kakao-${item.id}`,
    name: item.place_name,
    // 은행/편의점/지하철역/병원처럼 우리 카테고리 어디에도 안 맞는 결과는
    // 'business'로 — 필터 칩엔 없는 값이라 "전체" 탭에서만 보인다.
    category: (groupCode && KAKAO_CATEGORY_GROUP_TO_PLACE_CATEGORY[groupCode]) || 'business',
    address: item.road_address_name || item.address_name,
    lat: Number(item.y),
    lng: Number(item.x),
  }
}

// 2026-09 대화 중 요청 — "경복궁"/"인천공항"처럼 현재 위치에서 멀리 떨어진
// 유일한 랜드마크를 검색하면, sort=distance가 오히려 결과를 망가뜨리는 버그를
// 발견(현재 위치 근처의 이름만 겹치는 무관한 업체가 진짜 타겟보다 거리상
// 가깝다는 이유로 1등으로 올라옴 — 예: "인천공항" 검색 시 서울 시내 대리주차
// 업체가 실제 공항보다 위로 옴). sortByDistance를 분리해서, 정확도순
// (기본 정렬, near는 지역 힌트로만 쓰이고 진짜 랜드마크가 정상적으로 1위로
// 나옴)과 거리순을 각각 호출할 수 있게 한다.
function keywordSearch(query: string, near: Coordinates | undefined, sortByDistance: boolean): Promise<Place[]> {
  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places()
    const options = near
      ? {
          location: new kakao.maps.LatLng(near.lat, near.lng),
          ...(sortByDistance ? { sort: kakao.maps.services.SortBy.DISTANCE } : {}),
        }
      : undefined
    places.keywordSearch(
      query,
      (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(result.map(toPlace))
        } else {
          resolve([])
        }
      },
      options,
    )
  })
}

export async function searchKakaoArea(query: string, near?: Coordinates): Promise<KakaoAreaSearchResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null
  if (typeof kakao === 'undefined' || !kakao.maps?.services) return null

  const addressMatch = await addressSearch(trimmed)
  if (addressMatch) {
    return { type: 'address', center: addressMatch }
  }

  const [relevance, distance] = await Promise.all([
    keywordSearch(trimmed, near, false),
    keywordSearch(trimmed, near, true),
  ])
  if (relevance.length === 0 && distance.length === 0) return null

  // 거리순 목록에 정확도순과 같은 장소가 또 나오면 중복 제거(대화로 확정).
  const relevanceIds = new Set(relevance.map((p) => p.id))
  return { type: 'keyword', relevance, distance: distance.filter((p) => !relevanceIds.has(p.id)) }
}
