# insert, select, update (구글링 결과 장소 영업시간, 별점 등 변경사항이 있다면 update해야함)
from config.dependency import get_supabase_client

TABLE = "location"


def get_location(name: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


def upsert_location(location_data: dict) -> dict | None:
    """place_id(PK) 기준으로 없으면 insert, 있으면 update한다.

    호출부(routingService._ensure_coordinates)가 신규 행을 insert할 때는
    location_data에 place_id를 반드시 채워서 넘겨야 한다(PK not null).
    """
    client = get_supabase_client()
    result = client.table(TABLE).upsert(location_data, on_conflict="place_id").execute()
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


def upsert_places_batch(places: list[dict]) -> None:
    """지도 검색(TourAPI) 결과 목록을 한 번에 upsert한다(place_id 기준).

    검색 1회당 최대 numOfRows개 결과가 오는데, 개별 upsert_place()를 결과 수만큼
    반복 호출하면 DB 왕복이 그만큼 늘어나므로 배치 1콜로 처리한다.
    crowd_level/description은 검색 결과에 없는 필드라 아예 키를 넣지 않는다 —
    "찜하기"/"내 루트 추가" 시점에 upsert_place()가 채워둔 값을 덮어쓰지 않기 위함.
    반면 name/category/address/latitude/longitude/tags/image_url은 모든 행에서
    항상 채워서 보내야 한다(배치 내 행마다 키가 다르면 PostgREST가 누락된 컬럼을
    그 행에 한해 NULL로 덮어써버리는 경우가 있어, 필드 존재 여부를 행마다 다르게
    두면 위험하다).
    """
    if not places:
        return
    client = get_supabase_client()
    rows = [
        {
            "place_id": place["id"],
            "name": place.get("name"),
            "category": place.get("category"),
            "address": place.get("address"),
            "latitude": place.get("lat"),
            "longitude": place.get("lng"),
            "image_url": place.get("imageUrl"),
            "tags": place.get("tags") or [],
        }
        for place in places
    ]
    client.table(TABLE).upsert(rows, on_conflict="place_id").execute()
