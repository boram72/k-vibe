# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - K-Vibe지도(MapPage) 현위치 주변 관광명소 조회 -> externelAPI_services/tourAPI.py 호출
from fastapi import APIRouter

from externelAPI_services import tourAPI

router = APIRouter(prefix="/places", tags=["places"])


@router.get("")
def find_nearby_places(
    lat: float,
    lng: float,
    radius: int = 10000,
    locale: str | None = None,
):
    return tourAPI.find_nearby_places(latitude=lat, longitude=lng, radius=radius, locale=locale)
