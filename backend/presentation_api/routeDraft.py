# presentation_api 창구 역할: 요청을 받아 적절한 repository에 위임하고 응답만 반환한다.
# - Map/Analyze/Persona에서 누적한 루트 초안(RouteStop[]) 조회/저장 -> data_repositories/routedraftinfo.py 호출
# - 완료기록(route_progress)은 프론트가 독립적으로 전체 id 집합을 동기화하므로 여기서 건드리지 않는다.
from fastapi import APIRouter
from pydantic import BaseModel

from data_repositories import routedraftinfo

router = APIRouter(prefix="/route-draft", tags=["route-draft"])


class RouteStopRequest(BaseModel):
    id: str
    placeId: str | None = None
    name: str
    category: str
    address: str
    lat: float
    lng: float
    crowdLevel: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    stayMinutes: int | None = None
    startTime: str | None = None
    date: str | None = None
    isAnchor: bool | None = None
    fromPersona: bool | None = None


class RouteDraftRequest(BaseModel):
    stops: list[RouteStopRequest]
    plan: dict | None = None


@router.get("/{username}")
def get_route_draft(username: str):
    return {
        "stops": routedraftinfo.get_route_draft(username),
        "plan": routedraftinfo.get_route_draft_meta(username),
    }


@router.put("/{username}")
def save_route_draft(username: str, body: RouteDraftRequest):
    """편집 멈춘 뒤 디바운스로 호출 — 초안 전체를 통째로 덮어쓴다(delete 후 재삽입)."""
    stops = routedraftinfo.save_route_draft(username, [s.model_dump() for s in body.stops])
    routedraftinfo.save_route_draft_meta(username, body.plan)
    return {"stops": stops, "plan": body.plan}
