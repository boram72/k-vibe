# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - K-Vibe지도(MapPage) 현위치 주변 관광명소 조회 -> externelAPI_services/tourAPI.py 호출
# - location 테이블은 특정 유저 개인 데이터가 아니라 서비스 전체가 공유하는 장소 카탈로그라,
#   검색으로 노출된 결과는 (내 루트 추가/찜하기 여부와 무관하게) 여기서 바로 캐싱한다.
import logging

from fastapi import APIRouter

from data_repositories import locationinfo
from externelAPI_services import tourAPI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/places", tags=["places"])


@router.get("")
def find_nearby_places(
    lat: float,
    lng: float,
    radius: int = 10000,
    locale: str | None = None,
):
    places = tourAPI.find_nearby_places(latitude=lat, longitude=lng, radius=radius, locale=locale)
    try:
        locationinfo.upsert_places_batch(places)
    except Exception:
        # 캐싱 실패가 지도 검색 응답 자체를 막으면 안 된다.
        logger.exception("장소 검색결과 location 캐싱 실패")
    return places
