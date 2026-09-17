# google api 검색엔진 사용할수있도록 api 연결interface
# - Places API "Find Place from Text" + "Place Details"로 장소명/주소 -> 영업시간(weekday_text) 조회.
# - TourAPI detailCommon2가 실패하거나 영업시간을 제공하지 않을 때의 폴백으로 쓰인다(presentation_api/places.py).
# - 쿼터 초과(OVER_QUERY_LIMIT)를 포함해 status가 "OK"가 아닌 모든 경우, API 키 미설정, 요청 실패는
#   전부 None을 반환해 호출부가 별도 분기 없이 "영업시간 정보없음" 폴백 UI로 이어지게 한다.
import httpx

from config.configure import GOOGLE_MAPS_API_KEY

FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def _find_place_id(query: str) -> str | None:
    response = httpx.get(
        FIND_PLACE_URL,
        params={
            "input": query,
            "inputtype": "textquery",
            "fields": "place_id",
            "key": GOOGLE_MAPS_API_KEY,
        },
        timeout=5.0,
    )
    response.raise_for_status()
    body = response.json()
    if body.get("status") != "OK":
        return None
    candidates = body.get("candidates") or []
    return candidates[0]["place_id"] if candidates else None


def get_opening_hours(name: str, address: str | None = None) -> str | None:
    """장소명(+주소)으로 구글 Place Details를 조회해 영업시간 표시 문자열을 반환한다.

    Find Place From Text로 place_id를 찾은 뒤 Place Details(fields=opening_hours)를
    조회하는 2단계 조회다. 두 호출 중 어느 쪽이든 status가 "OK"가 아니면(OVER_QUERY_LIMIT,
    REQUEST_DENIED, ZERO_RESULTS, INVALID_REQUEST, UNKNOWN_ERROR 등) None을 반환한다.
    """
    if not GOOGLE_MAPS_API_KEY or not name:
        return None

    query = f"{name} {address}" if address else name
    try:
        place_id = _find_place_id(query)
        if not place_id:
            return None

        response = httpx.get(
            PLACE_DETAILS_URL,
            params={
                "place_id": place_id,
                "fields": "opening_hours",
                "key": GOOGLE_MAPS_API_KEY,
            },
            timeout=5.0,
        )
        response.raise_for_status()
        body = response.json()
        if body.get("status") != "OK":
            return None

        weekday_text = (body.get("result") or {}).get("opening_hours", {}).get("weekday_text")
        return "\n".join(weekday_text) if weekday_text else None
    except httpx.HTTPError:
        return None
