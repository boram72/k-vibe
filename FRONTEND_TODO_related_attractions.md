# 백엔드 → 프론트 TODO: 연관관광지 응답에 관광지코드 추가

**작성일**: 2026-07-21
**대상**: 프론트엔드 담당자
**배경**: 한국관광공사 TourAPI `TarRlteTarService1`(관광지별 연관관광지) 매뉴얼 v4.1에서 응답 항목에 `tAtsCd`(관광지코드)가 추가됐습니다. `GET /attractions/related`가 반환하는 각 항목에 `attractionContentId` 필드를 추가했습니다(`backend/externelAPI_services/tourAPI.py`).

## 변경 사항
`find_related_attractions()` / `GET /attractions/related` 응답 각 item에 필드 1개 추가:

```json
{
  "attractionContentId": "3dbadaccd57c18ae536e552040025fa8",
  "attractionName": "간현관광지",
  "relatedContentId": "...",
  "relatedName": "...",
  ...
}
```

## 프론트 TODO (선택 사항, 필요할 때 반영)
- `frontend/src/api/attractions.ts`의 `RelatedAttraction` 인터페이스에 `attractionContentId?: string` 필드 추가
- `MOCK_RELATED_ATTRACTIONS` mock 데이터에도 동일 필드 추가(선택)
- 현재는 이 필드를 화면에서 쓰는 곳이 없어 당장 반영 안 해도 API 호출/파싱은 깨지지 않습니다. `attractionName`(관광지명) 대신 코드 기반으로 특정 관광지를 식별/링크해야 하는 요구가 생기면 이 필드를 사용하시면 됩니다.
