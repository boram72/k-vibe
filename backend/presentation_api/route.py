# presentation_api 창구 역할: 요청을 받아 적절한 repository/service에 위임하고 응답만 반환한다.
# - 사용자 경로(USERROUTE) 조회 요청 -> data_repositories/routeinfo.py 호출
# - 이동시간 계산 요청 -> business_services/routingService.py 호출
# - ui 경로 편집(update/insert) 요청 -> data_repositories/routeinfo.py 호출
from fastapi import APIRouter

from business_services import routingService
from data_repositories import routeinfo

router = APIRouter(prefix="/route", tags=["route"])


@router.get("/{username}")
def get_route(username: str):
    return routeinfo.get_user_route(username)


@router.put("/{username}")
def update_route(username: str, locations: list[str]):
    return routeinfo.save_user_route(username, locations)


@router.post("/{username}/estimate")
def estimate_route_time(username: str, place_ids: list[str]):
    return routingService.calculate_route_time(place_ids)
