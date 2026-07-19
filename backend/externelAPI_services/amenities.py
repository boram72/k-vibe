# 편의시설 레이더용 편의점/약국/은행(ATM) 조회.
# - 한국관광공사 TourAPI는 관광콘텐츠(관광지/문화시설/숙박 등)만 다루고 편의점/약국/은행
#   카테고리가 없어서, 카카오 로컬 API(카테고리 검색)로 조회한다 (externelAPI_services/kakaomap.py).
from externelAPI_services import kakaomap

CATEGORY_GROUP_CODES = {
    "convenience_store": "CS2",
    "pharmacy": "PM9",
    "bank_atm": "BK9",
}


def find_nearby_amenities(
    latitude: float,
    longitude: float,
    radius: int = 1000,
    category: str | None = None,
) -> list[dict]:
    """좌표 기준 반경 내 편의점/약국/은행(ATM)을 조회한다.

    category가 None이거나 'all'이면 세 카테고리 전부를 합쳐서 거리순으로 반환한다.
    """
    if category and category != "all" and category not in CATEGORY_GROUP_CODES:
        raise ValueError(f"지원하지 않는 카테고리: {category}")

    categories = (
        CATEGORY_GROUP_CODES
        if not category or category == "all"
        else {category: CATEGORY_GROUP_CODES[category]}
    )

    results = []
    for category_id, group_code in categories.items():
        items = kakaomap.search_category_nearby(latitude, longitude, radius, group_code)
        for item in items:
            results.append({**item, "category": category_id})

    results.sort(key=lambda item: item["distance"] if item["distance"] is not None else float("inf"))
    return results
