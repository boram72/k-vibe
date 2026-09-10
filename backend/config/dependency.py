# 연결하는 외부 api 의존성들 기록
from functools import lru_cache

from supabase import Client, create_client

from config.configure import REDIS_URL, SUPABASE_KEY, SUPABASE_URL


@lru_cache
def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@lru_cache
def get_redis_client():
    # SNS 분석기 결과 캐시용(Render Key Value 등 Redis 호환 저장소). 캐시라서
    # 미설정/연결 실패/패키지 미설치 시 호출부(snsAnalysisService)가 예외를 잡아
    # "캐시 미스"로 처리한다 — 그래서 redis import도 여기서 지연 로딩한다.
    # socket 타임아웃을 짧게 둬서 Redis가 느려도 /analyze 응답이 지연되지 않게
    # 한다(타임아웃 -> 예외 -> 캐시 미스 -> 정상 분석 진행).
    if not REDIS_URL:
        raise RuntimeError(
            "REDIS_URL 환경변수가 설정되지 않았습니다. backend/.env 또는 Render 대시보드를 확인하세요."
        )
    import redis

    return redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
