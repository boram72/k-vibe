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
