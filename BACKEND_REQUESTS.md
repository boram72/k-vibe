# 백엔드 수정 요청 모음

**대상**: 백엔드 담당자
**설명**: 프론트엔드 작업 중 발견된 백엔드 수정 필요 사항을 모아두는 문서. 새 요청이 생기면 아래에 이어서 추가(기존 항목은 그대로 두고 append). 기존에 주제별로 따로 있던 `OAUTH_INTEGRATION_REQUEST.md`/`I18N_JA_ZH_TRANSLATION_REQUEST.md`는 이미 작성된 별도 문서라 그대로 두고, **이후 새로 생기는 요청은 이 문서 하나로 모음**.

---

이전에 등록됐던 1~5번 항목(display_name 컬럼/`/user/display-name` 엔드포인트, `/personas/places` 페르소나 3명 데이터 누락, `/places?locale=en|ja|zh` 카테고리 매핑, `/places/{content_id}` defaultYN/overviewYN 파라미터 오류, `/routes/generate` 크래시)은 전부 해결 완료(PR #83/#85 등).

## 6. 리뷰 수정(edit) 엔드포인트 없음 — 2026-09-18

### 배경
지도 상세 팝업의 리뷰 탭에 수정/삭제 기능을 추가하려고 확인해보니, 삭제(`DELETE /reviews/{place_id}/{review_id}`)는 이미 있는데 **수정 엔드포인트 자체가 없음**(`presentation_api/reviews.py`엔 GET/POST/DELETE만 존재). 프론트는 일단 수정 UI(인라인 편집 폼)와 `updatePlaceReview()`(`api/reviews.ts`)를 미리 만들어뒀지만, 지금은 호출하면 404/405로 실패합니다.

### 요청 사항
`PATCH /reviews/{place_id}/{review_id}` 신규 추가. 기존 `delete_review`와 동일하게 **본인 리뷰만 수정 가능**하도록 `username` 조건을 걸어주세요.
- Request body: `{"username": "...", "rating": 1~5, "content": "..."}` (POST의 `ReviewCreateRequest`와 동일 모양 재사용 가능)
- 동작: `reviews` 테이블에서 `id == review_id AND username == username`인 행을 `rating`/`content`로 업데이트, 없으면 404
- Response: 갱신된 리뷰 레코드(GET/POST와 동일 모양 — `display_name` 포함해서 내려주면 프론트 추가 처리 불필요)
- `create_review`/`delete_review`처럼 수정 후에도 `_recompute_location_rating(place_id)` 호출 필요(별점이 바뀌면 평균도 바뀌므로)

### 참고 — 프론트는 이미 받을 준비를 해둠(이번에 완료, 백엔드 작업과 무관하게 선반영)
- `api/reviews.ts`에 `updatePlaceReview(placeId, reviewId, username, rating, content)` 추가 — `PATCH /reviews/{place_id}/{review_id}` 호출, GET/POST와 동일한 `normalizeReview()`로 응답 파싱
- `blocks/map/place-review-tab.tsx`에 연필 아이콘 → 인라인 편집 폼(별점+내용 재입력) → 저장 UI 추가, 본인 리뷰(`user.id === review.username`)에만 노출
- 위 엔드포인트가 추가되는 즉시(프론트 재배포 없이) 정상 동작함 — 지금은 API가 없어서 저장 시도 시 에러 토스트만 뜸
