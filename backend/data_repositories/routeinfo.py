# insert, select, update
# - USERROUTE 존재 여부 확인 및 조회 (presentation_api/route.py에서 호출)
# - ui 경로 편집(update/insert) 실제 db 반영 (presentation_api/route.py에서 호출)
from config.dependency import get_supabase_client

TABLE = "userroute"


def get_user_route(username: str) -> list[dict]:
    """사용자가 저장한 나만의 루트를 이동순서(order)대로 조회한다."""
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("*")
        .eq("username", username)
        .order("order")
        .execute()
    )
    return result.data


def save_user_route(username: str, locations: list[str]) -> list[dict]:
    """ui에서 경로 편집이 있었다면 기존 루트를 지우고 새 순서로 다시 저장한다."""
    client = get_supabase_client()
    client.table(TABLE).delete().eq("username", username).execute()

    if not locations:
        return []

    rows = [
        {
            "id": f"{username}_{i + 1}",
            "username": username,
            "order": i + 1,
            "location": location,
        }
        for i, location in enumerate(locations)
    ]
    result = client.table(TABLE).insert(rows).execute()
    return result.data
