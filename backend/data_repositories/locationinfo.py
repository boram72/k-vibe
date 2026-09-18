# insert, select, update (구글링 결과 장소 영업시간, 별점 등 변경사항이 있다면 update해야함)
from datetime import datetime, timedelta, timezone

from config.dependency import get_supabase_client

TABLE = "location"

# 장소 상세시트(전화번호/영업시간/개요) 캐시 유효기간. 이 값들은 자주 안 바뀌는
# 데이터라 하루 정도는 재조회 없이 캐시를 신뢰해도 무방하다고 판단(presentation_api/places.py 참고).
DETAIL_CACHE_TTL = timedelta(hours=24)


def get_location(name: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


def get_location_by_place_id(place_id: str) -> dict | None:
    """place_id(PK)로 장소를 조회한다. persona.locationname은 location.place_id를
    참조하는 FK라 정수값이 들어있으므로, name이 아닌 이 함수로 조회해야 한다.
    """
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("place_id", place_id).execute()
    return result.data[0] if result.data else None


def get_locations_by_place_ids(place_ids: list[str]) -> dict[str, dict]:
    """여러 place_id를 한 번의 조회로 가져온다(N+1 방지).

    페르소나 경로의 stop마다 get_location_by_place_id를 개별 호출하면 stop 수만큼
    Supabase 왕복이 직렬로 늘어나 느려진다(personaRouteService._load_persona_route_from_db).
    place_id -> row 매핑으로 반환해 호출부가 순서를 유지하며 조회할 수 있게 한다.
    """
    if not place_ids:
        return {}
    client = get_supabase_client()
    result = client.table(TABLE).select("*").in_("place_id", place_ids).execute()
    return {row["place_id"]: row for row in (result.data or [])}


def update_location_rating(place_id: str, rating: float | None) -> None:
    """reviews 평균 평점을 location.rating에 반영한다(reviewinfo._recompute_location_rating 호출부).

    upsert가 아니라 update만 한다 — reviews.place_id가 location.place_id를 참조하는
    FK라 이미 존재하는 행만 대상이 되고, 존재하지 않는 place_id로 신규 행을 만들
    이유가 없다.
    """
    client = get_supabase_client()
    client.table(TABLE).update({"rating": rating}).eq("place_id", place_id).execute()


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

    place_id 중복 방지: 페르소나 하드코딩 폴백 장소처럼 TourAPI place_id가 없는 곳은
    프론트가 장소명을 임시 place_id로 대신 써서 넘기는 경우가 있다(찜하기/내 루트 추가).
    이 place_id가 아직 location에 없는 신규 행이라면, 같은 name으로 이미 저장된(TourAPI
    place_id를 가진) 행이 있는지 먼저 확인해 있으면 그 행의 place_id를 재사용한다 —
    그렇지 않으면 같은 실제 장소가 place_id만 다른 행 2개로 쪼개져 location.name 중복
    (`GROUP BY name HAVING COUNT(*)>1`)이 발생한다(실측: 페르소나 카탈로그 폴백 장소들).
    """
    client = get_supabase_client()

    if name and not get_location_by_place_id(place_id):
        existing = get_location(name)
        if existing and existing.get("place_id") != place_id:
            place_id = existing["place_id"]

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


def get_cached_place_detail(place_id: str) -> dict | None:
    """장소 상세시트(전화번호/영업시간/개요/태그) 캐시를 조회한다.

    TourAPI detailCommon2/detailIntro2/categoryCode2 + 카카오 전화번호 폴백을
    매번 라이브로 호출하면 왕복이 누적돼 느려서(실측 2.7초, tourAPI.get_place_detail
    참고), 한 번 조회된 결과를 location 테이블에 캐싱해두고 DETAIL_CACHE_TTL 이내면
    그대로 반환한다. 캐싱된 적 없거나(detail_cached_at is None) TTL이 지났으면
    캐시 미스(None)로 처리해 호출부가 라이브로 다시 조회하게 한다.
    """
    location = get_location_by_place_id(place_id)
    cached_at_raw = location.get("detail_cached_at") if location else None
    if not cached_at_raw:
        return None

    cached_at = datetime.fromisoformat(cached_at_raw.replace("Z", "+00:00"))
    if datetime.now(timezone.utc) - cached_at > DETAIL_CACHE_TTL:
        return None

    return {
        "phone": location.get("phone"),
        "businessHours": location.get("business_hours"),
        "overview": location.get("overview"),
        "tags": location.get("tags") or [],
    }


def cache_place_detail(place_id: str, detail: dict) -> None:
    """get_place_detail() 조회 결과(전화번호/영업시간/개요/태그)를 location에 캐싱한다.

    upsert가 아니라 update만 한다 - Postgres는 INSERT ... ON CONFLICT DO UPDATE라도
    실제로 conflict가 나서 UPDATE로 처리될 행이라 해도, INSERT 시도 자체를 구성하는
    단계에서 NOT NULL 제약(location.name 등)을 검사한다. 즉 payload에 name을 안 넣으면
    "이미 존재하는" place_id를 갱신하려는 경우에도 NOT NULL 위반으로 실패한다(실측:
    place_id=750982 "이북만두"는 location에 이미 있었는데도 에러 발생). 상세 캐싱은
    항상 이미 알려진 장소(location.place_id가 이미 존재)를 대상으로 하므로 update만으로
    충분하고, 혹시 없는 place_id라면 0건 갱신되고 조용히 끝난다(에러 없음).
    """
    client = get_supabase_client()
    client.table(TABLE).update(
        {
            "phone": detail.get("phone"),
            "business_hours": detail.get("businessHours"),
            "overview": detail.get("overview"),
            "tags": detail.get("tags") or [],
            "detail_cached_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("place_id", place_id).execute()


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
