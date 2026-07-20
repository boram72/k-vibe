-- K-Vibe Tracker DB 스키마
-- DB테이블스키마-2.pdf 기준. Supabase SQL Editor에 붙여넣어 실행.
-- oracle -> supabase 타입 매핑: varchar2 -> text, number -> int2, number(2,1) -> float4, boolean -> bool

-- USER: 사용자 정보 저장
create table "user" (
  username text primary key,
  nationality text,
  email text,
  password text
);

-- LOCATION: 장소별 상세 정보 저장
create table location (
  name text primary key,
  town text,
  rating float4,
  workingday text,
  openinghour text,
  locationurl text
);

-- PERSONA: K스타들의 이동경로 저장
-- ISUSE: 해당 경로 사용 여부(Y/N), ROUTECNT: 전체 경로 길이, ORDER: 경로 이동순서
create table persona (
  id text primary key,
  name text not null,
  isuse bool,
  routecnt int2,
  "order" int2,
  locationname text references location(name)
);

-- DOCENT: 장소별 음성파일 위치 저장 (언어별 mp3 경로)
create table docent (
  name text primary key references location(name),
  korean text,
  english text,
  chinese text,
  japanese text,
  german text,
  french text,
  russian text
);

-- USERROUTE: 사용자가 페르소나 루트를 저장한 뒤, 이동경로 편집하며 저장하는 자신만의 루트
create table userroute (
  id text primary key,
  username text references "user"(username),
  "order" int2,
  location text references location(name)
);

-- 이동시간(도보) 계산을 위해 좌표 컬럼 추가. 기존에 테이블을 만들었다면 아래만 추가로 실행.
alter table location add column if not exists latitude float8;
alter table location add column if not exists longitude float8;

-- ============================================================
-- 로그인 유저의 기기 간 데이터 동기화 (프론트 localStorage -> 서버 이전)
-- ============================================================

-- SAVED_PLACES: 하트로 찜한 장소. TourAPI contentid 기준 place_id를 그대로 저장하고
-- location 테이블은 참조하지 않음(찜한 시점의 이름/주소 스냅샷을 보존하는 목적,
-- TourAPI 결과가 아직 location 테이블에 자동 upsert되지 않아 FK를 걸면 저장 자체가 실패할 수 있음).
create table if not exists saved_places (
  username text not null references "user"(username),
  place_id text not null,
  order_index int2 not null,
  name text,
  category text,
  address text,
  lat float8,
  lng float8,
  image_url text,
  crowd_level text,
  tags text[],
  saved_at timestamptz not null default now(),
  primary key (username, place_id)
);

-- PERSONA_PREFERENCE: 위저드에서 마지막으로 선택한 테마/디테일(유저당 1행, 히스토리 불필요).
-- 스타별 고정 이동경로를 저장하는 PERSONA 테이블과는 이름만 비슷할 뿐 무관한 도메인.
create table if not exists persona_preference (
  username text primary key references "user"(username),
  theme text,
  detail text,
  updated_at timestamptz not null default now()
);

-- ROUTE_DRAFT_STOP: Map/Analyze/Persona에서 누적한 "루트 초안" 전체.
-- 기존 USERROUTE(location 테이블 FK, 장소명 하나만 저장)로는 좌표/카테고리/체류시간/
-- anchor 여부 등을 담을 수 없어 신규 테이블로 분리. location 테이블은 참조하지 않고
-- saved_places와 동일하게 스냅샷으로 저장.
create table if not exists route_draft_stop (
  username text not null references "user"(username),
  stop_id text not null,
  order_index int2 not null,
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
  primary key (username, stop_id)
);

-- ROUTE_DRAFT_META: Persona 위저드가 만든 RoutePlan(제목/요약 등)은 스팟 단위 데이터가
-- 아니라 유저당 1행만 필요해서 route_draft_stop과 분리, jsonb로 통째로 저장.
create table if not exists route_draft_meta (
  username text primary key references "user"(username),
  plan jsonb
);

-- ROUTE_PROGRESS: 완료 체크한 스팟 id 집합. route_draft_stop과 반드시 별도 테이블로 둘 것 —
-- save_route_draft()가 편집 결과를 delete 후 재삽입하는 방식이라, 완료 여부가 같은 테이블에
-- 있으면 루트 초안을 저장할 때마다(디바운스) 완료 표시가 매번 초기화되는 버그가 생김.
-- 행이 존재하면 완료, 없으면 미완료 (별도 bool 컬럼 불필요).
create table if not exists route_progress (
  username text not null references "user"(username),
  stop_id text not null,
  primary key (username, stop_id)
);
