-- 장소 상세시트(전화번호/영업시간/개요) 캐싱용 컬럼 추가.
-- 목적: /places/{content_id} 호출 시 TourAPI+카카오를 매번 라이브로 조회하지 않고,
-- 한 번 조회된 결과를 location 테이블에 캐싱해서 재조회(다른 사용자 포함) 시
-- 즉시 응답하기 위함. detail_cached_at으로 캐시 최신성을 판단한다.

alter table location
  add column if not exists phone text,
  add column if not exists business_hours text,
  add column if not exists overview text,
  add column if not exists detail_cached_at timestamptz;
