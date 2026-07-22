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

-- TourAPI 검색결과(contentid)를 담을 수 있도록 확장. route_draft_stop/saved_places가
-- 각자 들고 있던 name/category/address/lat/lng/crowd_level/tags 스냅샷을 여기로
-- 일원화한다 — 동일 장소가 여러 유저의 행에 중복 저장되면 주소변경/폐업 등 실제
-- 변경사항을 전부 따라가며 갱신할 수 없어 데이터 정합성이 깨지기 때문(2026-07-21 결정).
alter table location add column if not exists place_id text unique;
alter table location add column if not exists address text;
alter table location add column if not exists category text;
alter table location add column if not exists image_url text;
alter table location add column if not exists tags text[];
alter table location add column if not exists crowd_level text;

-- location의 PK를 name -> place_id로 교체(2026-07-21). 처음엔 name(PK)을 persona/docent
-- 큐레이션 도메인 그대로 두고 place_id를 별도 unique key로만 추가했는데, upsert_place()가
-- place_id 기준 on_conflict로 upsert해도 name이 기존 다른 행과 우연히 같은 텍스트면
-- name(PK) unique 제약 위반으로 실패하는 버그가 있었다(예: TourAPI 검색결과 name이
-- 기존 큐레이션 장소명과 동일한 경우). 레거시(persona/docent 전용, place_id 없던) 행은
-- place_id = name으로 백필해서 persona/docent/userroute의 FK 컬럼 값과 앱 코드는
-- 그대로 유지한 채 참조 대상만 location(place_id)로 옮겼다.
-- 아래는 기존 DB에 이미 실행한 마이그레이션 기록(신규 DB라면 위 create table에서
-- place_id를 바로 primary key로 만들 것 — 이 블록은 실행하지 말 것).
-- update location set place_id = name where place_id is null;
-- alter table location alter column place_id set not null;
-- alter table persona drop constraint if exists persona_locationname_fkey;
-- alter table docent drop constraint if exists docent_name_fkey;
-- alter table userroute drop constraint if exists userroute_location_fkey;
-- alter table saved_places drop constraint if exists saved_places_place_id_fkey;
-- alter table route_draft_stop drop constraint if exists route_draft_stop_place_id_fkey;
-- alter table location drop constraint location_pkey;
-- alter table location drop constraint location_place_id_key;
-- alter table location add primary key (place_id);
-- alter table persona add constraint persona_locationname_fkey foreign key (locationname) references location(place_id);
-- alter table docent add constraint docent_name_fkey foreign key (name) references location(place_id);
-- alter table userroute add constraint userroute_location_fkey foreign key (location) references location(place_id);
-- alter table saved_places add constraint saved_places_place_id_fkey foreign key (place_id) references location(place_id);
-- alter table route_draft_stop add constraint route_draft_stop_place_id_fkey foreign key (place_id) references location(place_id);

-- ============================================================
-- 로그인 유저의 기기 간 데이터 동기화 (프론트 localStorage -> 서버 이전)
-- ============================================================

-- SAVED_PLACES: 하트로 찜한 장소. TourAPI contentid 기준 place_id로 location 테이블을
-- 참조한다(장소 스냅샷은 upsert_place()가 저장 시점에 location에 함께 upsert하므로
-- FK 저장 실패 걱정 없음 — 정규화 리팩터링, 2026-07-21).
create table if not exists saved_places (
  username text not null references "user"(username),
  place_id text not null references location(place_id),
  order_index int2 not null,
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
-- anchor 여부 등을 담을 수 없어 신규 테이블로 분리. 장소 스냅샷은 location(place_id)
-- FK로 참조하고(정규화 리팩터링, 2026-07-21), description(AI 추천 사유 등 스팟별
-- 코멘트)만 장소 고유 데이터가 아니라 여기 유지한다. stop_id는 프론트의 RouteStop.id로
-- 같은 place_id가 한 루트에 여러 번(예: Persona 위저드에서 중복 추가) 들어갈 수 있어
-- place_id와는 별도 식별자다.
create table if not exists route_draft_stop (
  username text not null references "user"(username),
  stop_id text not null,
  order_index int2 not null,
  place_id text not null references location(place_id),
  description text,
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
