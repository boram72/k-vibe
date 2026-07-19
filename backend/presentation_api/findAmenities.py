# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - 편의시설(편의점/약국/은행) 조회 요청 -> externelAPI_services/amenities.py 호출
from fastapi import APIRouter

from externelAPI_services import amenities

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get("")
def find_amenities(
    lat: float,
    lng: float,
    radius: int = 1000,
    category: str | None = None,
):
    return amenities.find_nearby_amenities(latitude=lat, longitude=lng, radius=radius, category=category)
