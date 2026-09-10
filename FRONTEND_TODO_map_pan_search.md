# 백엔드 → 프론트 TODO: k-vibe 지도 이동(pan) 시 재검색 기능

**작성일**: 2026-09-10
**대상**: 프론트엔드 담당자
**배경**: k-vibe 지도 화면에서 사용자가 지도를 손으로 이동(pan)해도 새 위치 기준으로 장소가
다시 조회되지 않는다는 사용자 리포트가 있었습니다. 코드 확인 결과 현재는 실제로 그런 동작이
없습니다.

## 현재 동작 (코드 기준)
`frontend/src/pages/MapPage.tsx`:
```ts
const effectiveCoords = focusPlaces[0]
  ? { lat: focusPlaces[0].lat, lng: focusPlaces[0].lng }
  : coords

const { data: places = [] } = useQuery({
  queryKey: ['map-places', effectiveCoords.lat, effectiveCoords.lng, i18n.language],
  queryFn: () => fetchMapPlaces({ lat: effectiveCoords.lat, lng: effectiveCoords.lng, ... }),
})
```
`effectiveCoords`는 (1) 다른 화면에서 넘어온 `focusPlaces` 좌표, 또는 (2) `useCurrentLocation()`의
GPS 좌표(`coords`) 둘 중 하나로만 정해집니다. `frontend/src/blocks/map/map-canvas.tsx`의
`onRequestLocation`(지도 위 "내 위치" 버튼)도 GPS 재요청일 뿐, 지도 뷰포트 중심으로 검색하는 기능이
아닙니다. 즉 지도를 드래그해서 다른 동네로 이동해도 `/places` 재호출이 발생하지 않습니다.

## 요청 사항
지도를 이동한 뒤 "이 위치에서 재검색" 버튼(구글/네이버 지도류에서 흔한 패턴)을 눌러야 그 위치
기준으로 `/places`를 다시 조회하도록 구현해주세요.

1. `MapCanvas`(카카오맵 SDK 래핑부)에서 지도 이동 완료 시점(`dragend`/`idle` 이벤트)에 뷰포트
   중심 좌표를 부모로 알려주는 콜백(예: `onCenterChanged?: (coords: Coordinates) => void`)을
   추가
2. `MapPage`는 `searchCenter` state를 별도로 두고, 초기값은 지금처럼 GPS 좌표로 시작
3. 지도 이동으로 `onCenterChanged`가 오면 즉시 재검색하지 말고, 이동한 중심 좌표를 임시로 들고
   있다가 "이 위치에서 재검색" 버튼이 눌렸을 때만 `searchCenter`를 갱신 (지도를 스치기만 해도
   매번 API를 호출하면 낭비이므로)
4. `useQuery`의 `queryKey`/`queryFn`이 `effectiveCoords` 대신 `searchCenter`를 쓰도록 변경

## 백엔드 쪽 대응
- 백엔드는 이미 `GET /places?lat=&lng=&radius=&locale=`로 임의 좌표를 받고 있어서 추가 변경 없이
  바로 씁니다 (`presentation_api/places.py`).
- 검색 결과는 `/places` 호출 시 자동으로 `location` 테이블에 캐싱되므로, 새 지역을 재검색할 때마다
  그 지역 장소들이 점진적으로 채워집니다.

---

# 백엔드 → 프론트 TODO: 리뷰가 보였다 안 보였다 하는 문제 (localStorage 폴백)

**작성일**: 2026-09-10
**대상**: 프론트엔드 담당자
**배경**: "리뷰를 추가하면 DB에 저장되는게 맞는지, 로그아웃/다른 계정 로그인 시 리뷰가 보였다 안
보였다 왔다갔다 한다"는 리포트가 있었습니다. 백엔드 확인 결과 `GET /reviews/{place_id}`는
로그인 여부와 완전히 무관하게 항상 동일한 결과를 반환합니다(`presentation_api/reviews.py`
주석: "조회(GET)는 인증 없이 누구나 호출 가능"). 실제 원인은 프론트의 `withFallback` 폴백 로직이
API 호출 실패 시 브라우저별 `localStorage`로 조용히 전환되기 때문입니다.

## 현재 동작 (코드 기준)
`frontend/src/api/client.ts`:
```ts
export async function withFallback<T>(
  realCall: () => Promise<T>,
  mockFallback: () => T | Promise<T>,
): Promise<T> {
  if (!API_BASE_URL) return mockFallback()
  try {
    return await realCall()
  } catch (err) {
    console.warn('[api] falling back to mock data:', err)
    return mockFallback()
  }
}
```
`apiClient`의 `timeout`은 8000ms입니다. Render 무료 티어의 콜드 스타트 등으로 백엔드 응답이
느리거나 실패하면 이 catch가 발동해 실제 DB 대신 브라우저별 `localStorage`(`k-vibe-mock-reviews`,
`frontend/src/api/reviews.ts`)를 읽거나 씁니다:
```ts
const MOCK_REVIEWS_STORAGE_KEY = 'k-vibe-mock-reviews'

export async function fetchPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  return withFallback(
    async () => { /* 실제 GET /reviews/{placeId} */ },
    () => readMockReviewsStore()[placeId] ?? [],
  )
}

export async function createPlaceReview(...): Promise<PlaceReview> {
  return withFallback(
    async () => { /* 실제 POST /reviews/{placeId} */ },
    () => { /* localStorage에만 mock-${Date.now()} 리뷰 저장 */ },
  )
}
```
즉 사용자가 리뷰를 작성한 시점에 백엔드 호출이 실패하면 그 리뷰는 실제 `reviews` 테이블이
아니라 그 브라우저의 `localStorage`에만 저장되고, 다른 기기/브라우저/시크릿창에서는 절대
보이지 않습니다. 반대로 조회 시점에 실패하면 실제로는 존재하는 리뷰가 안 보이고 그 브라우저에
저장된 mock 리뷰만 보입니다. 로그인 상태 자체와는 무관하고, 새로고침/재방문 타이밍이 백엔드
콜드 스타트 실패와 우연히 겹치면서 "왔다갔다 하는" 것처럼 보이는 것입니다.

> 참고: 호출이 **성공**하는 경우(대부분)는 정상적으로 실제 DB에 저장/조회되므로 다른
> 기기·브라우저에서도 똑같이 보입니다. 문제는 그 중 일부만 (콜드 스타트 등으로) **실패**할
> 때 조용히 그 브라우저만의 `localStorage`로 새는 것이고, 이 "성공 케이스"와 "실패 케이스"가
> 섞이기 때문에 "완전히 안 보임"이 아니라 "왔다갔다"하는 것처럼 관찰되는 것입니다.

## 요청 사항
1. 리뷰 조회/작성 실패 시 조용히 mock 데이터로 폴백하지 말고, 사용자에게 실패를 알리고
   재시도할 수 있게 해주세요(예: 에러 토스트 + 재시도 버튼). 최소한 실패했다는 사실이
   사용자에게 보여야 합니다.
2. `localStorage` mock 저장소는 실제 백엔드가 있는 한 실제 데이터와 값이 달라질 수 있는
   위험한 패턴이므로, 리뷰 기능에서는 제거하거나 최소한 "오프라인 임시 저장"이라는 사실을
   UI에 명시해주세요.
3. (선택) `apiClient`의 `timeout`을 늘리거나, 재시도 로직을 추가해 콜드 스타트로 인한 실패
   자체를 줄이는 것도 도움이 됩니다.

## 백엔드 쪽 대응
- `GET /reviews/{place_id}`, `POST /reviews/{place_id}`는 인증 상태와 무관하게 정상 동작하며
  추가 변경이 필요 없습니다 (`presentation_api/reviews.py`, `data_repositories/reviewinfo.py`).
- 프로덕션 `reviews` 테이블은 정상적으로 존재하고 실제 데이터가 쌓이고 있음을 확인했습니다.
