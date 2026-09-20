# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - K-Vibe지도(MapPage) 현위치 주변 관광명소 조회 -> externelAPI_services/tourAPI.py 호출
# - location 테이블은 특정 유저 개인 데이터가 아니라 서비스 전체가 공유하는 장소 카탈로그라,
#   검색으로 노출된 결과는 (내 루트 추가/찜하기 여부와 무관하게) 여기서 바로 캐싱한다.
import logging

from fastapi import APIRouter, HTTPException

from data_repositories import locationinfo
from externelAPI_services import searchGoogle, tourAPI

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

    # 대화 중 발견(8-2) — 리뷰 작성/삭제 시마다 그 장소의 평균 평점을 이미
    # location.rating에 반영해두고 있는데(reviewinfo._recompute_location_rating),
    # 이 목록 응답은 그 값을 안 읽고 TourAPI 원본만 내려주고 있었음. 그래서
    # 프론트가 카드마다 GET /reviews/{placeId}를 개별 호출해 평점을 계산해야
    # 했고, 반경검색 결과가 30~40개면 그만큼 동시 요청이 몰려 503을 유발했다.
    # 이미 캐싱된 place_id로 location을 다시 조회해 rating만 합쳐주면 그
    # 개별 호출 자체가 필요 없어진다.
    try:
        locations = locationinfo.get_locations_by_place_ids([place["id"] for place in places])
        for place in places:
            location = locations.get(place["id"])
            place["rating"] = location.get("rating") if location else None
    except Exception:
        logger.exception("장소 평점(location.rating) 병합 실패")
        for place in places:
            place["rating"] = None

    return places


@router.get("/{content_id}")
def get_place_detail(content_id: str, lat: float | None = None, lng: float | None = None, name: str | None = None):
    """장소 상세시트 온디맨드 조회(전화번호/영업시간/카테고리 태그). 클릭 시에만 호출됨.

    TourAPI+카카오 라이브 조회는 왕복이 누적돼 느리므로(실측 2.7초, tourAPI.get_place_detail
    참고), 한 번 조회에 성공한 결과는 location 테이블에 캐싱해 재조회 시 즉시 응답한다
    (locationinfo.DETAIL_CACHE_TTL 이내). TourAPI detailCommon2가 실패하거나 영업시간을
    못 주는 경우, location 테이블에 캐싱된 name/address로 구글 Places를 폴백 조회한다.

    content_id가 TourAPI가 모르는 값(SNS영상분석에서 만든 synthetic id, 예:
    "analysis-{videoId}-{장소명}")이면 detailCommon2가 항상 실패한다. 프론트가
    lat/lng/name을 같이 보내주면 tourAPI.search_keyword()로 실제 contentId를
    찾아 재조회한다 - 찾은 결과는 (location.place_id를 바꾸지 않고) 원래
    content_id 그대로 캐싱한다. 셋 중 하나라도 없으면 이 폴백은 건너뛴다.
    """
    cached = locationinfo.get_cached_place_detail(content_id)
    if cached is not None:
        return cached

    detail = tourAPI.get_place_detail(content_id)

    if detail is None and name and lat is not None and lng is not None:
        resolved_content_id = tourAPI.search_keyword(name, latitude=lat, longitude=lng)
        if resolved_content_id:
            detail = tourAPI.get_place_detail(resolved_content_id)

    should_cache = detail is not None  # TourAPI 완전 실패(contentId 못 찾음)는 캐싱하지 않는다.

    location = None
    if detail is None or not detail.get("businessHours"):
        location = locationinfo.get_location_by_place_id(content_id)

    if detail is None:
        if location is None:
            raise HTTPException(status_code=404, detail="장소를 찾을 수 없습니다.")
        detail = {"phone": None, "businessHours": None, "overview": None, "tags": location.get("tags") or []}

    if not detail.get("businessHours") and location:
        detail["businessHours"] = searchGoogle.get_opening_hours(
            name=location.get("name"), address=location.get("address")
        )

    if should_cache:
        try:
            locationinfo.cache_place_detail(content_id, detail)
        except Exception:
            # 캐싱 실패가 상세시트 응답 자체를 막으면 안 된다.
            logger.exception("장소 상세정보 캐싱 실패")

    return detail
