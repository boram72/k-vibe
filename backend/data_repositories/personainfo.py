# insert, select
from config.dependency import get_supabase_client

TABLE = "persona"


def get_persona_route(name: str) -> list[dict]:
    """페르소나 스타 이름으로 저장된 이동경로를 순서(order)대로 조회한다."""
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("*")
        .eq("name", name)
        .eq("isuse", True)
        .order("order")
        .execute()
    )
    return result.data


def create_persona_stop(
    persona_id: str, name: str, routecnt: int, order: int, location_name: str
) -> dict | None:
    """페르소나 경로의 한 지점(stop)을 저장한다. id(PK) 기준 upsert로 중복 insert를 방지한다."""
    client = get_supabase_client()
    payload = {
        "id": persona_id,
        "name": name,
        "isuse": True,
        "routecnt": routecnt,
        "order": order,
        "locationname": location_name,
    }
    result = client.table(TABLE).upsert(payload, on_conflict="id").execute()
    return result.data[0] if result.data else None
