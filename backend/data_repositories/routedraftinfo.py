# insert, select, update
# - 사용자가 Map/Analyze/Persona에서 누적한 루트 초안(RouteStop[]) 저장/복원
#   (presentation_api/routeDraft.py에서 호출)
# - Persona 위저드가 만든 RoutePlan(제목/요약 등)은 스팟 단위 데이터가 아니라
#   route_draft_meta에 유저당 1행으로 별도 저장
# - 장소 스냅샷(name/category/address/lat/lng/crowdLevel/tags)은 location 테이블에
#   place_id로 정규화되어 있어(2026-07-21 리팩터링), 여기서는 스팟 고유 데이터만 다룬다.
from config.dependency import get_supabase_client
from data_repositories import locationinfo

STOP_TABLE = "route_draft_stop"
META_TABLE = "route_draft_meta"


def _to_row(username: str, order_index: int, stop: dict) -> dict:
    return {
        "username": username,
        "stop_id": stop["id"],
        "order_index": order_index,
        "place_id": stop.get("placeId") or stop["id"],
        "description": stop.get("description"),
        "stay_minutes": stop.get("stayMinutes"),
        "start_time": stop.get("startTime"),
        "stop_date": stop.get("date"),
        "is_anchor": stop.get("isAnchor"),
        "from_persona": stop.get("fromPersona"),
    }


def _to_stop(row: dict) -> dict:
    location = row.get("location") or {}
    return {
        "id": row["stop_id"],
        "placeId": row.get("place_id"),
        "name": location.get("name"),
        "category": location.get("category"),
        "address": location.get("address"),
        "lat": location.get("latitude"),
        "lng": location.get("longitude"),
        "crowdLevel": location.get("crowd_level"),
        "description": row.get("description"),
        "tags": location.get("tags"),
        "stayMinutes": row.get("stay_minutes"),
        "startTime": row.get("start_time"),
        "date": row.get("stop_date"),
        "isAnchor": row.get("is_anchor"),
        "fromPersona": row.get("from_persona"),
    }


def get_route_draft(username: str) -> list[dict]:
    client = get_supabase_client()
    result = (
        client.table(STOP_TABLE)
        .select("*, location(*)")
        .eq("username", username)
        .order("order_index")
        .execute()
    )
    return [_to_stop(row) for row in result.data]


def save_route_draft(username: str, stops: list[dict]) -> list[dict]:
    """편집이 멈춘 뒤(디바운스) 초안 전체를 통째로 덮어쓴다 — 기존 행을 지우고 새 순서로 재삽입.
    완료 여부(route_progress)는 별도 테이블이라 여기서 초기화되지 않는다.
    장소 스냅샷은 location 테이블에 먼저 upsert해 FK 참조가 항상 유효하게 한다."""
    client = get_supabase_client()
    client.table(STOP_TABLE).delete().eq("username", username).execute()

    if not stops:
        return []

    for stop in stops:
        locationinfo.upsert_place(
            place_id=stop.get("placeId") or stop["id"],
            name=stop.get("name"),
            category=stop.get("category"),
            address=stop.get("address"),
            latitude=stop.get("lat"),
            longitude=stop.get("lng"),
            tags=stop.get("tags"),
            crowd_level=stop.get("crowdLevel"),
        )

    rows = [_to_row(username, i, stop) for i, stop in enumerate(stops)]
    client.table(STOP_TABLE).insert(rows).execute()
    return stops


def get_route_draft_meta(username: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(META_TABLE).select("plan").eq("username", username).execute()
    return result.data[0]["plan"] if result.data else None


def save_route_draft_meta(username: str, plan: dict | None) -> None:
    """RoutePlan을 저장. 루트를 초기화(clearPersonaRoutePlan)한 경우엔 plan=None으로 호출해 행을 지운다."""
    client = get_supabase_client()
    if plan is None:
        client.table(META_TABLE).delete().eq("username", username).execute()
        return
    client.table(META_TABLE).upsert({"username": username, "plan": plan}, on_conflict="username").execute()
