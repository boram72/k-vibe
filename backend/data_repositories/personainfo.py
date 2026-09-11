# insert, select
from config.dependency import get_supabase_client

TABLE = "persona"
PIC_BUCKET = "k-vibe_storage"


def build_pic_url(piclocation: str | None) -> str | None:
    """persona.location_pic(버킷 내 상대경로) -> Supabase Storage 공개 URL."""
    if not piclocation:
        return None
    client = get_supabase_client()
    return client.storage.from_(PIC_BUCKET).get_public_url(piclocation)


def get_persona_route(name: str) -> list[dict]:
    """페르소나 스타 이름으로 저장된 이동경로를 순서(order)대로 조회한다."""
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("name", name).execute()
    rows = result.data or []

    def is_enabled(row: dict) -> bool:
        value = row.get("isuse", row.get("ISUSE", True))
        if isinstance(value, str):
            return value.upper() in {"Y", "TRUE", "1"}
        return bool(value)

    def order_key(row: dict) -> int:
        value = row.get("order_seq", row.get("ORDER_SEQ", row.get("order", 0)))
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    return sorted([row for row in rows if is_enabled(row)], key=order_key)


def get_all_persona_stops() -> list[dict]:
    """모든 페르소나의 활성화된 스팟을 한 번에 조회한다 (지도 스타별 필터용).

    name(페르소나 id)으로 나눠 여러 번 조회하지 않고, isuse=Y인 행 전체를 한 번의
    왕복으로 가져온 뒤 호출부에서 필요한 대로 그룹핑한다.
    """
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("isuse", "Y").execute()
    return result.data or []


def create_persona_stop(
    persona_id: str, name: str, routecnt: int, order: int, location_name: str
) -> dict | None:
    """페르소나 경로의 한 지점(stop)을 저장한다. id(PK) 기준 upsert로 중복 insert를 방지한다."""
    client = get_supabase_client()
    payload = {
        "id": persona_id,
        "name": name,
        "isuse": "Y",
        "routecnt": routecnt,
        "order_seq": order,
        "locationname": location_name,
    }
    result = client.table(TABLE).upsert(payload, on_conflict="id").execute()
    return result.data[0] if result.data else None
