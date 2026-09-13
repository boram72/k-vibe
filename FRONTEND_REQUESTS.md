# 프론트 수정 요청 모음

**대상**: 프론트엔드 담당자
**설명**: 백엔드 작업 중 발견된 프론트엔드 수정 필요 사항을 모아두는 문서. 앞으로 새 요청이 생기면
이 문서에 이어서 추가한다(기존 항목은 그대로 두고 append). 예전엔 주제별로
`FRONTEND_TODO_*.md` 파일을 따로 만들었는데, 파일이 여러 개로 흩어지면 프론트가 뭘 확인해야
하는지 놓치기 쉬워서 **이후 요청은 이 문서 하나로 모은다**. 기존 `FRONTEND_TODO_*.md` 파일들은
전부 반영 완료되어 삭제했다.

---

## 1. 리뷰 작성 시 실제 username 대신 표시용 display_name을 보내고 있음 (버그) — 2026-09-13

### 배경
프로필 표시 이름(`display_name`) 기능이 추가되면서(`POST /user/display-name`, PR#67),
`lib/auth.ts`의 `toAuthUser`가 `AuthUser.name`을 `display_name || username`으로 채우도록
바뀌었다. 그런데 `blocks/map/place-review-tab.tsx`의 리뷰 작성 로직이 여전히 이 `user.name`을
그대로 보내고 있다:

```ts
mutationFn: () => createPlaceReview(placeId, user!.name, rating, content.trim()),
```

### 문제
`reviews.username` 컬럼은 `user.username`(로그인 식별자, PK)을 참조하는 FK다. 지금까지는
`user.name === username`이라 우연히 문제가 없었지만, **사용자가 표시 이름을 username과 다르게
설정하는 순간** `user.name`이 display_name(예: "가현")이 되어버려서, 리뷰 작성 요청이
존재하지 않는 username으로 INSERT를 시도 → FK 위반으로 500 에러가 나며 리뷰 작성이 실패한다.

### 요청 사항
`place-review-tab.tsx`의 `createPlaceReview(placeId, user!.name, ...)`을
`createPlaceReview(placeId, user!.id, ...)`로 변경해달라(`user.id`가 실제 username,
`lib/auth.ts`의 `toAuthUser` 참고). `user.name`은 화면 표시 전용으로만 쓰고, 서버로 보내는
식별자는 항상 `user.id`를 써야 한다.

---

## 2. 리뷰 목록에 username 대신 display_name 표시 — 2026-09-13

### 배경
지도 장소 상세의 리뷰 탭이 작성자 이름 자리에 `review.username`(로그인 식별자, 예:
`google_1029384756`)을 그대로 노출하고 있다. 위 1번과 같은 이유로 표시용 이름과 식별자를
구분해야 한다는 요청.

### 백엔드 변경 사항 (이미 반영됨)
`GET /reviews/{place_id}` 응답의 각 항목에 `display_name` 필드를 추가했다(값이 없으면
`null`). `reviews.username`으로 `user` 테이블을 배치 조회해서 붙여준다.

```json
{
  "id": "r1",
  "place_id": "place-1",
  "username": "google_1029384756",
  "display_name": "가현",
  "rating": 5,
  "content": "정말 좋았어요",
  "created_at": "2026-09-01T00:00:00+00:00"
}
```

### 요청 사항
1. `api/reviews.ts`의 `PlaceReview`/`normalizeReview`에 `displayName` 필드 추가(`raw.display_name`
   파싱, 없으면 `undefined`).
2. `blocks/map/place-review-tab.tsx`에서 작성자 이름 표시를
   `review.username` → `review.displayName ?? review.username`으로 변경.
