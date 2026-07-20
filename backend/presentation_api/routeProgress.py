# presentation_api 창구 역할: 요청을 받아 적절한 repository에 위임하고 응답만 반환한다.
# - 완료 체크한 스팟 id 집합 조회/저장 -> data_repositories/routeprogressinfo.py 호출
# - route-draft와 별도 엔드포인트: 완료 체크 즉시 id 집합 전체 전송(디바운스 없음, delete 후 재삽입)
from fastapi import APIRouter
from pydantic import BaseModel

from data_repositories import routeprogressinfo

router = APIRouter(prefix="/route-progress", tags=["route-progress"])


class RouteProgressRequest(BaseModel):
    completedIds: list[str]


@router.get("/{username}")
def get_route_progress(username: str):
    return routeprogressinfo.get_completed_stop_ids(username)


@router.put("/{username}")
def save_route_progress(username: str, body: RouteProgressRequest):
    completed_ids = routeprogressinfo.save_route_progress(username, body.completedIds)
    return {"completedIds": completed_ids}
