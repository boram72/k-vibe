# insert, select, delete
# - 찜한 장소(SAVED_PLACES) 조회/저장 (presentation_api/savedPlaces.py에서 호출)
# - 프론트 db-sync.ts가 찜 목록 전체를 매번 통째로 PUT하므로 delete 후 재삽입한다.
# - 장소 스냅샷(name/category/address/lat/lng/imageUrl/crowdLevel/tags)은 location 테이블에
#   place_id로 정규화되어 있어(2026-07-21 리팩터링), 여기서는 찜 목록 순서만 다룬다.
from config.dependency import get_supabase_client
from data_repositories import locationinfo

TABLE = "saved_places"


def _to_row(username: str, order_index: int, place: dict) -> dict:
    return {
        "username": username,
        "place_id": place["id"],
        "order_index": order_index,
    }


def _to_place(row: dict) -> dict:
    location = row.get("location") or {}
    return {
        "id": row["place_id"],
        "name": location.get("name"),
        "category": location.get("category"),
        "address": location.get("address"),
        "lat": location.get("latitude"),
        "lng": location.get("longitude"),
        "imageUrl": location.get("image_url"),
        "crowdLevel": location.get("crowd_level"),
        "tags": location.get("tags"),
    }


def get_saved_places(username: str) -> list[dict]:
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("*, location(*)")
        .eq("username", username)
        .order("order_index")
        .execute()
    )
    return [_to_place(row) for row in result.data]


def save_saved_places(username: str, places: list[dict]) -> list[dict]:
    """하트 토글 즉시 호출 — 찜 목록 전체를 통째로 덮어쓴다(delete 후 재삽입).
    장소 스냅샷은 location 테이블에 먼저 upsert해 FK 참조가 항상 유효하게 한다."""
    client = get_supabase_client()
    client.table(TABLE).delete().eq("username", username).execute()

    if not places:
        return []

    for place in places:
        locationinfo.upsert_place(
            place_id=place["id"],
            name=place.get("name"),
            category=place.get("category"),
            address=place.get("address"),
            latitude=place.get("lat"),
            longitude=place.get("lng"),
            image_url=place.get("imageUrl"),
            tags=place.get("tags"),
            crowd_level=place.get("crowdLevel"),
        )

    rows = [_to_row(username, i, place) for i, place in enumerate(places)]
    client.table(TABLE).insert(rows).execute()
    return places
