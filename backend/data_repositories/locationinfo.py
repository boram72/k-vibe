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


def upsert_place(
    place_id: str,
    name: str | None = None,
    category: str | None = None,
    address: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    image_url: str | None = None,
    tags: list[str] | None = None,
    crowd_level: str | None = None,
) -> dict | None:
    """place_id(TourAPI contentid) 기준으로 장소 스냅샷을 upsert한다.

    호출부마다 갖고 있는 필드가 달라(route-draft는 imageUrl 없음, saved-places는
    description 없음 등) None인 필드는 payload에서 아예 제외해 기존 값을 덮어쓰지 않는다.
    """
    client = get_supabase_client()
    data = {"place_id": place_id}
    for key, value in {
        "name": name,
        "category": category,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "image_url": image_url,
        "tags": tags,
        "crowd_level": crowd_level,
    }.items():
        if value is not None:
            data[key] = value
    result = client.table(TABLE).upsert(data, on_conflict="place_id").execute()
    return result.data[0] if result.data else None
