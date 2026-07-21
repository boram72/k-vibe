# 백엔드 → 프론트 TODO: RouteStop에 placeId 필드 추가

**작성일**: 2026-07-21
**대상**: 프론트엔드 담당자
**배경**: 백엔드에서 `location` 테이블을 정규화했습니다(`route_draft_stop`/`saved_places`가 장소 스냅샷을
중복 저장하던 걸 `location(place_id)` 테이블 하나로 일원화). 이 리팩터링으로 `route_draft_stop`의
각 스팟은 이제 `stop_id`(스팟 고유 식별자, 기존 `RouteStop.id`)와 `place_id`(TourAPI contentid,
`location` 테이블 FK)를 **별도 컬럼**으로 저장합니다.

## 문제
`frontend/src/pages/PersonaPage.tsx:80`에서 위저드로 추가한 스팟의 `id`를 아래처럼 만듭니다:

```ts
plan.stops.map((s) => ({ ...s, id: `${s.id}-${ts}`, fromPersona: true }))
```

즉 같은 루트에 같은 장소를 여러 번 추가하면 `RouteStop.id`가 `"place123-1721xxxxx"`처럼 타임스탬프가
붙어 매번 달라집니다. 이 값을 그대로 `place_id`로 써서 `location` 테이블을 FK 참조하면, 매번 다른
"장소"로 취급되어 정규화가 깨집니다(같은 장소인데 `location`에 중복 행이 쌓이거나 FK 매칭이 안 됨).

## 요청 사항
`frontend/src/lib/route-draft.ts`의 `RouteStop` 인터페이스에 선택 필드 하나만 추가해주세요:

```ts
export interface RouteStop {
  id: string
  placeId?: string   // 신규: TourAPI contentid(장소 고유 식별자). id와 별도 — id는 스팟 인스턴스 식별자,
                      // placeId는 실제 장소 식별자. PersonaPage처럼 id에 접미사를 붙이는 곳에서 필요.
  name: string
  ...
}
```

그리고 `id`에 접미사를 붙이는 곳에서 원본 장소 id를 `placeId`로 같이 넣어주세요:

**`frontend/src/pages/PersonaPage.tsx:80`**
```ts
plan.stops.map((s) => ({ ...s, id: `${s.id}-${ts}`, placeId: s.id, fromPersona: true }))
```

**`frontend/src/blocks/map/place-detail-sheet.tsx:32`** (여기는 `id`를 그대로 쓰므로 `placeId`도 동일값으로)
```ts
addStopToRouteDraft({
  id: place.id,
  placeId: place.id,
  ...
})
```

## 백엔드 쪽 대응
- `PUT /route-draft/{username}`의 `RouteStopRequest`에 이미 `placeId: str | None = None` 추가해뒀습니다.
- `placeId`가 없으면(구버전 프론트 호출 등) `id`를 그대로 place_id로 폴백합니다(`stop.get("placeId") or stop["id"]`) — 지금 당장 반영 안 해도 API가 깨지진 않습니다.
- `saved_places`(찜한 장소)는 이 문제가 없어서 손댈 필요 없습니다 — 거기 `id`는 원래부터 TourAPI id 그대로 쓰고 있습니다.
