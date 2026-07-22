# 프론트 TODO: 지도 장소 팝업에서 "내 루트 추가" 클릭 시 팝업 자동 닫힘

**작성일**: 2026-07-21
**대상**: 프론트엔드 담당자
**배경**: K-Vibe 지도(MapPage)에서 장소 클릭 → 상세 팝업(`PlaceDetailSheet`) → "내 루트에 추가" 클릭해도
팝업이 계속 열려있어서 닫으려면 한 번 더 눌러야 하는 불편함이 있음(사용자 리포트).

## 대상 파일
`frontend/src/blocks/map/place-detail-sheet.tsx`의 `handleAddToRoute()`:

```ts
function handleAddToRoute() {
  if (!place) return
  addStopToRouteDraft({ ... })
  toast.success(t('placeDetail.added_to_route'))
}
```

## 요청 사항
루트 추가 성공 시 `onClose()`를 같이 호출해 팝업을 자동으로 닫아주세요:

```ts
function handleAddToRoute() {
  if (!place) return
  addStopToRouteDraft({ ... })
  toast.success(t('placeDetail.added_to_route'))
  onClose()
}
```

저장(하트)/공유 버튼은 그대로 열려있는 게 자연스러울 수 있어(연속으로 여러 액션 할 수도 있음) 요청 대상에서
제외했습니다. 필요 없다고 판단되면 스킵하셔도 됩니다.
