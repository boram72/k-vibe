# 장소 상세정보(전화번호/영업시간/카테고리 태그) 연동 요청

**작성일**: 2026-07-20
**대상**: 백엔드 담당자
**배경**: MapPage에서 핀/카드를 클릭하면 뜨는 상세 시트(`place-detail-sheet.tsx`)에 전화번호·영업시간·카테고리 태그를 추가하려고 합니다. 지금 `GET /places`(목록 조회)가 쓰는 TourAPI `locationBasedList2`는 사진(`firstimage`)까지는 주지만 전화번호·영업시간·소분류 카테고리명은 없음 — 별도 상세 엔드포인트를 한 번 더 호출해야 나옵니다(카카오 로컬 API는 이 셋 다 자체가 없다는 것도 확인했습니다).

> 원래 mock 데이터엔 `['한복','궁궐','역사']`처럼 감성 태그가 있었는데, 실제 API로는 이런 자유 텍스트 태그를 만들 방법이 없어서(AI 생성은 이번 범위 제외) **TourAPI의 소분류 카테고리명(`cat3`)을 태그처럼 사용**하기로 결정했습니다 — 사실상 "태그"라기보단 좀 더 세분화된 카테고리 라벨입니다.
>
> **범위 한정**: 이번엔 상세 시트를 열었을 때(온디맨드) 그 장소 1곳의 cat3만 보여주는 것까지만입니다. "이 태그를 클릭하면 목록의 다른 장소도 같이 필터링"은 목록 조회(`GET /places`) 응답에도 cat3가 있어야 해서(장소당 상세 API 호출 1번씩 추가 = 최대 30번) 비용이 커 **이번 범위에서 제외, 나중에 별도 논의**합니다.

---

## 왜 목록 조회에 다 안 넣고 상세를 따로 부르나

목록에 뜨는 장소가 최대 30개인데, 전부에 대해 상세 API까지 미리 부르면 낭비입니다. **사용자가 실제로 클릭해서 시트를 열 때만** 그 1곳에 대해 상세를 온디맨드로 조회하는 게 맞다고 판단했습니다.

## 필요한 엔드포인트 1개

### `GET /places/{content_id}`

- `content_id`: 목록 조회 응답의 `id` 필드(TourAPI `contentid`)를 그대로 사용 — 프론트가 이미 갖고 있는 값이라 추가로 뭘 저장할 필요 없음
- 백엔드 동작:
  1. TourAPI `detailCommon2?contentId={content_id}` 호출 → `tel`(전화번호), `overview`, `contenttypeid`, `cat3`(소분류 코드) 확보
  2. `contenttypeid`로 TourAPI `detailIntro2?contentId={content_id}&contentTypeId={contenttypeid}` 호출 → 영업시간 필드는 콘텐츠 타입별로 이름이 달라서 아래 표대로 매핑해서 하나의 필드로 정규화해 응답해주면 좋겠습니다:

  | contentTypeId | 영업시간 필드명 | 휴무일 필드명 |
  |---|---|---|
  | 12 관광지 | `usetime` | `restdate` |
  | 14 문화시설 | `usetimeculture` | `restdateculture` |
  | 28 레포츠 | `usetimeleports` | `restdateleports` |
  | 32 숙박 | `checkintime`/`checkouttime` | - |
  | 38 쇼핑 | `opentime` | `restdateshopping` |
  | 39 음식점 | `opentimefood` | `restdatefood` |
  | 15 축제공연행사 | `playtime`/`usetimefestival` | - |
  3. `cat3` 코드를 TourAPI `categoryCode2?cat1={cat1}&cat2={cat2}&cat3={cat3}` 조회로 한글명(예: "고궁", "전통시장")으로 변환 — 자주 조회될 코드라 백엔드에서 캐싱 권장

- 응답 형태 (프론트가 기대하는 필드):
  ```json
  {
    "phone": "02-1234-5678",
    "businessHours": "10:00~18:00 (월요일 휴무)",
    "overview": "설명 텍스트...",
    "tags": ["고궁"]
  }
  ```
  `tags`는 cat3 하나만 있으면 배열 요소 1개로 충분합니다(다중일 필요 없음). 값이 없으면 필드 자체를 생략하거나 `null`/`[]` — 프론트는 전부 optional로 처리합니다.

## 참고

- `serviceKey`/`MobileOS`/`MobileApp`/`_type` 등 공통 파라미터는 기존 `externelAPI_services/tourAPI.py`의 다른 함수들과 동일한 패턴 재사용하면 됩니다.
- 사진 추가 조회(`detailImage2`)는 이번 범위에서 제외 — 목록 조회 때 이미 받는 `firstimage`(`imageUrl`)로 충분하다고 판단, 필요해지면 추후 별도 요청.
- 카카오 로컬 API 기반 편의시설(`/amenities`, `radar` 페이지)은 이 요청과 무관 — 애초에 카카오 API에 영업시간/사진 필드가 없어서 적용 대상이 아님.

## 참고 — 프론트가 하게 될 일 (별도로 진행)

- `src/api/places.ts`에 `fetchPlaceDetail(contentId)` 추가, `withFallback()` 패턴으로 mock 대비
- `place-detail-sheet.tsx`가 열릴 때 `useQuery`로 이 엔드포인트 호출, 전화번호는 `<a href="tel:...">`로 탭하면 바로 통화 연결
