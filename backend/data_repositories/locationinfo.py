# insert, select, update (구글링 결과 장소 영업시간, 별점 등 변경사항이 있다면 update해야함)
from config.dependency import get_supabase_client

TABLE = "location"


def get_location(name: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


def upsert_location(location_data: dict) -> dict | None:
    """name(PK) 기준으로 없으면 insert, 있으면 update한다."""
    client = get_supabase_client()
    result = client.table(TABLE).upsert(location_data, on_conflict="name").execute()
    return result.data[0] if result.data else None
