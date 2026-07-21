# 프론트 → 백엔드 DB 연동 요청

**작성일**: 2026-07-19
**대상**: 백엔드/Supabase 담당자
**배경**: 프론트(`frontend/`)가 지금 localStorage로만 저장하고 있는 데이터 중, 로그인한 사용자라면 기기를 옮겨도 유지돼야 하는 4가지가 있습니다. 로그인/회원가입이 이미 붙어있는 패턴(`presentation_api/user.py` → `data_repositories/userinfo.py` → `user` 테이블)을 그대로 따라가면 됩니다.

> 참고: 로컬 테스트 중인 Supabase 프로젝트는 새로 만든 빈 프로젝트라 `user` 테이블조차 없었습니다(`db/schema.sql`을 SQL Editor에 실행 안 한 상태로 추정). 실제 서비스가 붙어있는 Supabase 프로젝트의 스키마와 여기 제안하는 스키마가 다를 수 있으니, 아래 내용은 "이런 데이터를 저장해야 한다"는 요구사항으로 봐주시고 실제 테이블 설계/컬럼명은 기존 스키마 컨벤션에 맞춰 조율 부탁드립니다.

---

## 공통 원칙 — 전송 시점(주기)

데이터 성격에 따라 전송 방식이 다릅니다. 프론트에서 API 함수를 만들 때도 이 기준으로 호출 위치를 잡을 예정입니다.

| 전송 방식 | 대상 | 이유 |
|---|---|---|
| **즉시 전송** (이벤트 발생 시 바로 1건 호출) | saved-places, route-progress, persona-preference | 전부 사람이 클릭/선택하는 순간에만 값이 바뀌는 단발 이벤트라 빈도가 낮음. 디바운스를 걸면 오히려 "눌렀는데 반영 안 됨" 체감 지연만 생김 |
| **디바운스 전송** (마지막 변경 후 1~2초 뒤 1회, 전체 덮어쓰기) | route-draft | 드래그 재정렬/연속 편집이 발생 가능한 유일한 데이터라 이벤트마다 보내면 트래픽 낭비. 편집 중엔 안 보내다가 잠잠해지면 최종 상태 1번 PUT + 페이지 이탈/탭 숨김 시 강제 flush 안전망 |

전부 **"부분 업데이트(diff)"가 아니라 "전체 덮어쓰기"**로 설계했습니다 — 기존 `routeinfo.py`의 `save_user_route()`(delete 후 재삽입)와 동일한 방식이라 백엔드도 같은 패턴 재사용 가능합니다.

---

## 1. `route-draft` — 사용자가 편집 중인 루트 (우선순위 최상)

**연동 데이터**: 사용자가 Map/Analyze(SNS분석)/Persona(위저드) 3곳에서 추가한 스팟들이 누적되는 "루트 초안" 전체 목록.

```ts
interface RouteStop {
  id: string              // 스팟 고유 id
  name: string
  category: string
  address: string
  lat: number
  lng: number
  crowdLevel?: 'low' | 'mid' | 'high'
  description?: string
  tags?: string[]
  stayMinutes?: number    // 체류시간(분)
  startTime?: string      // "HH:mm", 사용자가 직접 고정한 경우만 존재
  date?: string            // "YYYY-MM-DD", isAnchor일 때만 의미 있음
  isAnchor?: boolean       // 사용자가 시각/날짜를 직접 고정한 지점 여부
  fromPersona?: boolean    // Persona 위저드로 생성된 스팟인지 (도슨트 버튼 노출 조건)
}
```
저장 대상: `RouteStop[]` (순서 있는 배열 — 배열 순서 자체가 루트 순서)

**추가로 별도 저장**: Persona 위저드가 만든 `RoutePlan`(제목/요약/총 소요시간 등 스케줄링 결과) — 이 루트가 "Persona 출신"인지 판별해 RoutePage에서 도슨트 버튼을 보여주기 위함. 구조가 커서 `route_draft`와 합쳐도 되고 별도 컬럼(jsonb)으로 둬도 무방.

**전송 시점**: 디바운스 (편집 멈춘 후 1~2초 + 페이지 이탈 시 강제 flush)

**기존 테이블과의 관계**: `data_repositories/routeinfo.py`의 `userroute` 테이블(컬럼: `id`/`username`/`order`/`location`)이 개념은 비슷하지만, `location`이 문자열 하나뿐이라 위 필드(좌표/카테고리/체류시간/완료여부/`fromPersona` 등)를 못 담습니다. **신규 테이블 필요** 또는 `userroute`를 대체하는 확장 테이블 설계 필요.

**제안 스키마 예시**:
```sql
create table route_draft_stop (
  id text not null,                    -- RouteStop.id
  username text references "user"(username),
  order_index int2,                    -- 배열 내 순서
  name text,
  category text,
  address text,
  lat float8,
  lng float8,
  crowd_level text,
  description text,
  tags text[],
  stay_minutes int2,
  start_time text,
  stop_date date,
  is_anchor bool,
  from_persona bool,
  primary key (username, id)
);
```

---

## 2. `route-progress` — 완료 체크한 스팟 (우선순위 중)

**연동 데이터**: 완료 표시한 스팟 id들의 집합.
```ts
type RouteProgress = string[]   // 완료된 RouteStop.id 목록
```
RoutePage와 ProfilePage 양쪽에서 같은 값을 공유(어느 화면에서 토글해도 즉시 동기화).

**전송 시점**: 즉시 전송 (완료 체크박스 클릭 시 바로 1건)

**제안 스키마**: `route_draft_stop`에 `completed bool default false` 컬럼 추가로 충분해 보입니다 — 어차피 스팟 단위 상태라 별도 테이블 불필요.

---

## 3. `persona-preference` — 홈피드 개인화 힌트 (우선순위 하)

**연동 데이터**: Persona 위저드에서 마지막으로 선택한 테마/디테일 (홈피드 카테고리 개인화 칩에만 쓰임, 가벼운 데이터).
```ts
interface PersonaPreference {
  theme: 'kpop' | 'drama' | 'mood' | 'foodie' | 'creator' | 'history'
  detail: string   // 테마별 4개 중 1 (예: kpop -> 'bts'|'blackpink'|'newjeans'|'aespa')
  updatedAt: string  // ISO timestamp
}
```
유저당 1행(최신 선택값만 유지, 히스토리 불필요).

**전송 시점**: 즉시 전송 (위저드 완료 시 1회)

**기존 `persona` 테이블과 무관 — 이름 혼동 주의**: `data_repositories/personainfo.py`의 `persona` 테이블은 "K팝 스타별로 미리 정해둔 고정 이동경로"를 저장하는 완전히 다른 도메인입니다(스타 이름으로 조회, 프론트 위저드의 테마/디테일 선택과는 무관). **재사용 불가, 신규 테이블 필요**.

**제안 스키마 예시**:
```sql
create table persona_preference (
  username text primary key references "user"(username),
  theme text,
  detail text,
  updated_at timestamptz
);
```

---

## 4. `saved-places` — 하트로 찜한 장소

**연동 데이터**: 사용자가 저장(하트)한 장소 목록.
```ts
interface Place {
  id: string
  name: string
  category: 'all' | 'culture' | 'food' | 'fun' | 'photo' | 'cafe' | 'stay'
  address: string
  lat: number
  lng: number
  imageUrl?: string
  distanceM?: number
  crowdLevel?: 'low' | 'mid' | 'high'
  tags?: string[]
}
```
현재 게스트/로그인 유저 버킷을 분리해서 저장 중(`k-vibe-saved-places:{userId|guest}`) — 로그인 시 게스트 저장분을 계정으로 병합하는 로직(`mergeGuestSavedPlacesIntoUser`)이 이미 프론트에 있음. DB 이전 시에도 "로그인 시 게스트 저장분 병합" 흐름은 프론트가 유지하되, 서버에는 로그인 유저분만 저장하면 됩니다.

**전송 시점**: 즉시 전송 (하트 클릭 시 바로 1건, 토글이라 add/remove 구분 필요)

**제안 스키마 예시**:
```sql
create table saved_places (
  username text references "user"(username),
  place_id text,
  name text,
  category text,
  address text,
  lat float8,
  lng float8,
  image_url text,
  crowd_level text,
  tags text[],
  saved_at timestamptz,
  primary key (username, place_id)
);
```

---

## 요약 표

| 데이터 | 우선순위 | 전송 시점 | 신규 테이블 | 기존 테이블 재사용 가능? |
|---|---|---|---|---|
| route-draft | 최상 | 디바운스(1~2초) | `route_draft_stop` | ✕ (`userroute` 컬럼 부족) |
| route-progress | 중 | 즉시 | `route_draft_stop.completed` 컬럼 | ✕ (신규 컬럼 추가로 해결) |
| persona-preference | 하 | 즉시 | `persona_preference` | ✕ (`persona` 테이블은 다른 도메인) |
| saved-places | - | 즉시 | `saved_places` | ✕ (신규) |
