# 백엔드 수정 요청 모음

**대상**: 백엔드 담당자
**설명**: 프론트엔드 작업 중 발견된 백엔드 수정 필요 사항을 모아두는 문서. 새 요청이 생기면 아래에 이어서 추가(기존 항목은 그대로 두고 append). 기존에 주제별로 따로 있던 `OAUTH_INTEGRATION_REQUEST.md`/`I18N_JA_ZH_TRANSLATION_REQUEST.md`는 이미 작성된 별도 문서라 그대로 두고, **이후 새로 생기는 요청은 이 문서 하나로 모음**.

---

## 1. 프로필 표시 이름(display_name) 컬럼 추가 — 2026-09-10

### 배경
프로필 화면 이름 편집 기능을 추가하려는데, 지금 프론트에 보이는 "이름"이 사실 로그인 식별자인 `username`을 그대로 쓰고 있음(`lib/auth.ts`의 `AuthUser.name = username`). 문제는 OAuth 유저의 `username`이 `{provider}_{provider_user_id}`(예: `google_1029384756`) 형태로 자동 생성되는 값이라 사람이 보기엔 의미 없는 문자열이고, 이걸 그대로 "편집 가능한 이름"으로 노출할 수 없음.

### 왜 `username` 자체를 바꾸면 안 되는지
1. `username`이 `user` 테이블 PK이자 다른 테이블(`saved_places`/`route_draft` 등, 설계 예정)의 FK 후보라 바뀌면 연결이 끊김
2. **OAuth 유저는 로그인마다 `username`이 재생성됨** — `oauthService.py`의 `upsert_oauth_user()`가 매 로그인마다 `{provider}_{provider_user_id}`로 upsert하기 때문에, `username` 자체를 바꿔놔도 다음 로그인 때 원래 값으로 덮어써짐
3. ID/PW 유저는 `username`으로 로그인하므로, 바뀌면 로그인 자격 자체가 바뀌는 위험한 변경이 됨

그래서 `username`(내부 식별자, 불변)과 `display_name`(화면 표시용, 자유롭게 변경 가능)을 분리하는 방향으로 요청.

### 필요한 변경
1. **`user` 테이블에 컬럼 추가**: `display_name` (nullable, TEXT). 값이 없으면 프론트가 `username`으로 폴백 표시.
2. **새 엔드포인트**: `POST /user/display-name`
   - Request body: `{"username": "...", "display_name": "..."}`
   - 동작: 해당 `username` 레코드의 `display_name`을 upsert
   - Response: 갱신된 user 레코드(`password` 제외) — 기존 `/user/signup`·`/user/login` 응답과 동일 모양
   - 인증 토큰/세션 없이 `username`을 body로 직접 받는 현재 인증 방식과 동일 패턴 유지(다른 엔드포인트들과 일관성)
3. **`GET`류 응답에도 `display_name` 포함**: `/user/login` 등 기존에 user 레코드를 리턴하는 곳들도 `display_name` 필드를 그대로 포함해서 내려주면 됨(따로 뺄 필요 없음)

### 참고 — 프론트가 하게 될 일 (백엔드 작업과 무관, 별도로 진행)
- `AuthUser`에 `displayName?: string` 추가, 표시 시 `displayName ?? username` 폴백
- `profile-header.tsx`에 이름 옆 편집 아이콘 → 입력 → 저장 시 `POST /user/display-name` 호출 + 로컬 세션 갱신

---

## 2. `GET /personas/places`가 최근 추가된 페르소나 3명 데이터를 안 내려줌 — 2026-09-12

### 배경
지도 스타별 필터(팀 태스크보드 12번)에서 `GET /personas/places?locale=`를 붙이는 작업 중 발견. `GET /personas?locale=ko`(카탈로그)는 6명 전부 정상 반환하는데(`BTS뷔`/`아이유`/`제니`/`장원영`/`코르티스 성현`/`투어스 신유`, `routeCnt` 4~5 정상), `GET /personas/places?locale=ko`는 그중 **BTS뷔/아이유/제니 3명분 장소만 내려오고, 장원영/코르티스 성현/투어스 신유 3명은 태그가 하나도 없음**(직접 호출로 확인, 총 14건 중 이 3명 태그는 0건).

### 확인 방법
```bash
curl -s "http://localhost:8000/personas/places?locale=ko" | python3 -c "
import json,sys
d = json.load(sys.stdin)
tags = set()
for p in d: tags.update(p.get('tags', []))
print(tags)  # {'제니', 'BTS뷔', '아이유'} — 6명이어야 하는데 3명뿐
"
```

### 요청 사항
`personaRouteService.get_persona_places`(또는 그 안에서 조인하는 location ⋈ persona 테이블)가 최근 추가된 3개 페르소나(`장원영`은 기존부터 있었는데 이것도 빠져있음 — 원래 4명 중에서도 누락, `코르티스 성현`/`투어스 신유`는 신규 추가분)의 장소 데이터를 포함하도록 채워주세요. 프론트는 하드코딩 없이 이 엔드포인트 응답을 그대로 쓰는 구조라, 데이터만 채워지면 프론트 변경 없이 바로 반영됩니다.

---

## 3. `GET /places?locale=en|ja|zh`에서 카테고리가 전부 "culture" 하나로 뭉개짐 — 2026-09-16

### 배경
지도 QA 중 발견: 같은 좌표로 `locale=ko`로 조회하면 카테고리가 `food`/`culture`/`attraction`/`shopping` 등으로 다양하게 나오는데, `locale=ja`(en/zh도 동일)로 조회하면 **30건 전부 `category: "culture"`** 하나로 나옴.

### 원인
`externelAPI_services/tourAPI.py`의 `CONTENT_TYPE_TO_CATEGORY` 매핑이 `KorService2`의 `contentTypeId`(12/14/15/28/32/38/39) 기준으로만 만들어져 있는데, `find_nearby_places()`가 `locale != ko`일 때 호출하는 `EngService2`/`JpnService2`/`ChsService2`(외국어 서비스)는 **완전히 다른 번호 체계의 `contentTypeId`를 씀** — 그래서 `CONTENT_TYPE_TO_CATEGORY.get(content_type_id, "culture")`가 전부 매칭 실패하고 기본값(`"culture"`)으로만 떨어짐.

### 확인 방법 (실측, 이름 대조로 매핑 검증 완료)
```bash
curl -s "http://localhost:8000/places?lat=37.5665&lng=126.978&radius=5000&locale=ja" \
  | python3 -c "import json,sys; from collections import Counter; d=json.load(sys.stdin); print(Counter(p['category'] for p in d))"
# Counter({'culture': 30})  <- 전부 culture
```
외국어 서비스 응답 항목의 한글 원문이 괄호 안에 같이 오는 경우가 많아(예: `"ソウル図書館（서울도서관）"`) 그 한글 이름으로 `locale=ko` 응답과 대조해서 실제 대응관계를 확인했고, `en`/`zh`도 동일한 번호 체계임을 확인함(`en`/`zh`로 재조회해 동일 `contentTypeId` 분포 확인):

| 외국어 서비스 contentTypeId | 의미 | KorService2 contentTypeId(기존 매핑 키) |
|---|---|---|
| 75 | 레포츠 | 28 |
| 76 | 관광지 | 12 |
| 78 | 문화시설 | 14 |
| 79 | 쇼핑 | 38 |
| 80 | 숙박 | 32 |
| 82 | 음식점 | 39 |
| 85 | 축제공연행사 | 15 |

(80/85는 실제 항목 제목으로 육안 검증: 80 = 호텔/게스트하우스류, 85 = K-POP 페스티벌/서울빛초롱축제/공연류 — 전부 숙박/축제 범주와 일치)

### 요청 사항
`CONTENT_TYPE_TO_CATEGORY`를 `locale=ko`일 때만 쓰고, `locale != ko`(외국어 서비스 응답)일 때는 위 표 기준의 별도 매핑 테이블을 하나 더 만들어서 그걸로 분류해주세요. (`find_nearby_places()`에서 locale에 따라 두 매핑 중 하나를 골라 쓰도록 분기하면 될 것 같습니다.) 프론트 쪽 변경은 필요 없음 — 카테고리 값 자체가 기존과 동일한 6개 enum(`attraction`/`culture`/`festival`/`shopping`/`food`/`stay`)으로만 나오면 됩니다.

---

## 4. `GET /places/{content_id}`(장소 상세 전화번호/영업시간)가 항상 실패함 — 2026-09-16

### 배경
지도에서 장소 상세를 열면 전화번호/영업시간이 항상 "서비스 준비중"(프론트 mock 폴백)으로만 뜸. 실제로는 이 엔드포인트가 한 번도 성공한 적이 없어서 매번 mock으로 빠지고 있었음(구현된 지 오래됐지만 실키로 end-to-end 테스트가 안 됐던 것으로 보임).

### 원인
`externelAPI_services/tourAPI.py`의 `_fetch_detail_common()`이 TourAPI `detailCommon2` 호출 시 `defaultYN=Y`, `overviewYN=Y` 파라미터를 같이 보내는데, 이 두 파라미터가 지금 이 API 키/버전에서 `INVALID_REQUEST_PARAMETER_ERROR`를 유발해서 **요청 자체가 항상 실패**함(HTTP 200으로 오지만 바디가 에러 형태라 조용히 빈 결과로 처리되고, 404로 이어짐).

### 확인 방법 (실측)
```bash
# defaultYN 포함 → 에러
curl -s "https://apis.data.go.kr/B551011/KorService2/detailCommon2?...&contentId=750982&defaultYN=Y"
# {"resultCode":"10","resultMsg":"INVALID_REQUEST_PARAMETER_ERROR(defaultYN)"}

# 두 파라미터 다 빼고 호출 → 정상, overview 필드도 기본 포함되어 옴
curl -s "https://apis.data.go.kr/B551011/KorService2/detailCommon2?...&contentId=750982"
# {"resultCode":"0000","resultMsg":"OK", ... "overview": "서울시청 뒷골목에 위치한..." , "tel": "" ...}
```
`detailIntro2`(영업시간)는 이 파라미터 문제가 없어서 정상 동작 확인(예: 750982 "이북만두"의 `opentimefood`에 실제 영업시간, `infocenterfood`에 실제 문의전화 "02-776-7361"이 들어있음) — 근데 `detailCommon2`가 먼저 실패해서 `get_place_detail()`이 `common is None`으로 조기 반환되며 이 정상 데이터까지 못 감.

### 요청 사항
`_fetch_detail_common()`의 요청 파라미터에서 `defaultYN`, `overviewYN` 제거 부탁드립니다(제거해도 `overview` 필드는 기본으로 포함되는 것 확인함). 한 줄짜리 수정이라 원하시면 프론트 쪽에서 바로 고쳐서 PR 올려도 될 것 같습니다 — 확인 부탁드려요.

---

## 5. ~~`POST /routes/generate` — 페르소나 루트 생성이 매번 크래시남~~ — 2026-09-17 (**이미 수정 완료, 기록용**)

> **추가 확인 결과: 이미 고쳐져 있었음.** 아래 재현은 로컬 백엔드가 최신 `main`을 반영하기 전(재시작 안 한 상태) 코드로 떠 있어서 발생한 것 — 같은 날 가현님이 PR #81(`fix(persona): location_story jsonb 확장으로 ja/zh 로케일 지원`)로 `personaRouteService.py`/`routingService._pick()`을 이미 수정해서 `main`에 병합해두셨음(`_pick()`을 `text.get(locale) or text.get("en") or text.get("ko")` 폴백 체인으로, `location["description"]`이 dict면 그대로 쓰도록 변경). 로컬 백엔드를 최신 `main`으로 재시작하면 해결됨 — 새로 요청할 내용 없음, 기록만 남김.

### 배경
지도 회귀 테스트 중 발견: 홈에서 페르소나 카드를 클릭하면 결과 화면 대신 에러 화면("문제가 발생했습니다")이 뜸. 콘솔에 `Error: Objects are not valid as a React child (found: object with keys {en, ja, ko, zh})` — `route-result.tsx`가 `stop.description`을 그대로 렌더링하는데, 그 값이 문자열이 아니라 객체 그대로 와서 발생.

### 확인 방법 (실측, 지금도 재현됨)
```bash
curl -s -X POST http://localhost:8000/routes/generate \
  -H "Content-Type: application/json" \
  -d '{"persona_id":"아이유","start_time":"10:00","locale":"ko"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['stops'][0]['description'])"
# {'en': 'The place where IU starts her day...', 'ja': '...', 'ko': '아이유가...', 'zh': '...'}
# <- locale=ko로 요청했는데 문자열이 아니라 4개 언어 다 든 딕셔너리 전체가 옴
```
BTS뷔로도 동일하게 재현됨 — 특정 페르소나만의 문제 아니고 전부 영향받는 것으로 보임.

### 원인 추정
`business_services/personaRouteService.py`의 `_normalize_db_location()`:
```python
description = source.get("description") or f"{name} 방문 코스입니다."
...
"description": {"ko": description, "en": description},
```
이 코드는 `source.get("description")`(DB `location.description` 컬럼 값)이 **항상 문자열**이라고 가정하고 `{"ko": description, "en": description}`로 감싸는데, 실제로는 그 컬럼 값 자체가 이미 `{en,ja,ko,zh}` 형태의 JSON 객체로 들어있는 것으로 보임 — 그래서 결과적으로 `{"ko": {en,ja,ko,zh 객체}, "en": {en,ja,ko,zh 객체}}`처럼 한 겹 더 감싸진 구조가 되고, `routingService._pick(desc, "ko")`가 `desc["ko"]`를 꺼내면 문자열이 아니라 그 안에 든 4개 언어 객체 전체가 나옴. (`_pick()` 자체는 `{ko,en}` 2키 구조만 가정하고 만들어진 함수라 이런 케이스를 처리 못함.)

즉 `location.description` 컬럼이 최근에 문자열에서 다국어 JSON 객체로 바뀐 것 같은데, 그걸 소비하는 `_normalize_db_location()`/`_pick()` 쪽이 그에 맞게 업데이트가 안 된 것으로 보입니다. (지도 쪽 카테고리/전화번호 조사하던 중 우연히 발견한 것이라 DB 스키마 변경 이력까지는 확인 못 했습니다 — 백엔드에서 `location.description` 컬럼이 실제로 언제/왜 이렇게 바뀌었는지 확인 부탁드려요.)

### 요청 사항
`location.description`이 이제 다국어 객체로 온다면, `_normalize_db_location()`이 그 객체에서 바로 `locale`에 맞는 언어를 꺼내도록(또는 `_pick()`이 4키 구조도 처리하도록) 수정 부탁드립니다. **현재 페르소나→루트생성 기능 전체가 막혀 있는 상태라 우선순위 높음.**
