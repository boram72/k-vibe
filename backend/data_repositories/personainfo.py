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
