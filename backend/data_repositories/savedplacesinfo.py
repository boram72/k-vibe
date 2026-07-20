# insert, select, delete
# - 찜한 장소(SAVED_PLACES) 조회/저장 (presentation_api/savedPlaces.py에서 호출)
# - 프론트 db-sync.ts가 찜 목록 전체를 매번 통째로 PUT하므로 delete 후 재삽입한다.
from config.dependency import get_supabase_client

TABLE = "saved_places"


def _to_row(username: str, order_index: int, place: dict) -> dict:
    return {
        "username": username,
        "place_id": place["id"],
        "order_index": order_index,
        "name": place.get("name"),
        "category": place.get("category"),
        "address": place.get("address"),
        "lat": place.get("lat"),
        "lng": place.get("lng"),
        "image_url": place.get("imageUrl"),
        "crowd_level": place.get("crowdLevel"),
        "tags": place.get("tags"),
    }


def _to_place(row: dict) -> dict:
    return {
        "id": row["place_id"],
        "name": row.get("name"),
        "category": row.get("category"),
        "address": row.get("address"),
        "lat": row.get("lat"),
        "lng": row.get("lng"),
        "imageUrl": row.get("image_url"),
        "crowdLevel": row.get("crowd_level"),
        "tags": row.get("tags"),
    }


def get_saved_places(username: str) -> list[dict]:
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("*")
        .eq("username", username)
        .order("order_index")
        .execute()
    )
    return [_to_place(row) for row in result.data]


def save_saved_places(username: str, places: list[dict]) -> list[dict]:
    """하트 토글 즉시 호출 — 찜 목록 전체를 통째로 덮어쓴다(delete 후 재삽입)."""
    client = get_supabase_client()
    client.table(TABLE).delete().eq("username", username).execute()

    if not places:
        return []

    rows = [_to_row(username, i, place) for i, place in enumerate(places)]
    result = client.table(TABLE).insert(rows).execute()
    return [_to_place(row) for row in result.data]
