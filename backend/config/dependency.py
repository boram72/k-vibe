# 연결하는 외부 api 의존성들 기록
from functools import lru_cache

from supabase import Client, create_client

from config.configure import SUPABASE_KEY, SUPABASE_URL


@lru_cache
def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)
