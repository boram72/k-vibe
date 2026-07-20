# insert, select, delete
# - 완료 체크한 스팟 id 집합 조회/저장 (presentation_api/routeProgress.py에서 호출)
# - route_draft_stop과 반드시 별도 테이블: save_route_draft()가 delete 후 재삽입하는
#   방식이라, 완료 여부가 같은 테이블에 있으면 루트 초안을 저장할 때마다 완료 표시가
#   초기화되는 문제가 생긴다. 행이 존재하면 완료, 없으면 미완료(별도 bool 컬럼 불필요).
# - 프론트 db-sync.ts가 완료 id 집합 전체를 매번 통째로 PUT하므로 delete 후 재삽입한다.
from config.dependency import get_supabase_client

TABLE = "route_progress"


def get_completed_stop_ids(username: str) -> list[str]:
    client = get_supabase_client()
    result = client.table(TABLE).select("stop_id").eq("username", username).execute()
    return [row["stop_id"] for row in result.data]


def save_route_progress(username: str, completed_ids: list[str]) -> list[str]:
    """완료 체크/해제 즉시 호출 — 완료 id 집합 전체를 통째로 덮어쓴다(delete 후 재삽입)."""
    client = get_supabase_client()
    client.table(TABLE).delete().eq("username", username).execute()

    if not completed_ids:
        return []

    rows = [{"username": username, "stop_id": stop_id} for stop_id in completed_ids]
    client.table(TABLE).insert(rows).execute()
    return completed_ids
