# SNS 분석기 결과 캐시(ANALYZE_CACHE) 조회/저장.
# - business_services/snsAnalysisService.py 에서만 호출.
# - (video_id, locale) 조합이 키. Gemini 영상분석이 느리고(요청당 15~60초) 무료
#   티어 할당량이 있어, 한 번 분석한 영상은 결과를 재사용한다.
# - 캐시 테이블이 아직 없거나 Supabase 연결이 없어도 분석 자체는 계속 동작해야
#   하므로, 여기서 나는 예외는 호출부가 잡아 "캐시 미스"로 취급한다.
from config.dependency import get_supabase_client

TABLE = "analyze_cache"


def get_cached_result(video_id: str, locale: str) -> dict | None:
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("result")
        .eq("video_id", video_id)
        .eq("locale", locale)
        .limit(1)
        .execute()
    )
    rows = result.data
    return rows[0]["result"] if rows else None


def save_result(video_id: str, locale: str, result: dict) -> None:
    client = get_supabase_client()
    client.table(TABLE).upsert(
        {"video_id": video_id, "locale": locale, "result": result}
    ).execute()
