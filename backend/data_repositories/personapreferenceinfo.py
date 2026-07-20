# insert, select, update
# - 홈피드 개인화용 마지막 persona 위저드 선택값 조회/저장 (presentation_api/personaPreference.py에서 호출)
from datetime import datetime, timezone

from config.dependency import get_supabase_client

TABLE = "persona_preference"


def get_persona_preference(username: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("username", username).execute()
    return result.data[0] if result.data else None


def upsert_persona_preference(username: str, theme: str, detail: str) -> dict:
    """유저당 1행만 유지(히스토리 불필요) — username(PK) 기준으로 매번 덮어쓴다."""
    client = get_supabase_client()
    row = {
        "username": username,
        "theme": theme,
        "detail": detail,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = client.table(TABLE).upsert(row, on_conflict="username").execute()
    return result.data[0]
