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
