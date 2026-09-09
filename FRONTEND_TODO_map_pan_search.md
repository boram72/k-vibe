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
