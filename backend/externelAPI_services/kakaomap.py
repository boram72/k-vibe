# 경로계산할때 kakaomap api호출할거라 api연결interface상세
# - Kakao Local API(키워드 검색)로 장소명 -> 좌표(위도/경도) 변환.
# - Kakao Local API(좌표->행정구역)로 좌표 -> 시도/시군구명 변환(연관관광지 추천용 지역코드 매핑에 사용).
# - Kakao Local API(카테고리 검색)로 좌표+반경 내 편의점/약국/은행 등 편의시설 조회(편의시설 레이더용).
#   REST API 키 필요(카카오 개발자 콘솔에서 발급, .env의 KAKAO_REST_API_KEY).
import httpx

from config.configure import KAKAO_REST_API_KEY

KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
COORD_TO_REGION_URL = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json"
CATEGORY_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/category.json"


def search_coordinates(query: str) -> dict | None:
    """장소명(키워드)으로 카카오 로컬 검색을 호출해 좌표를 반환한다."""
    if not KAKAO_REST_API_KEY:
        raise RuntimeError(
            "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    response = httpx.get(
        KEYWORD_SEARCH_URL,
        params={"query": query},
        headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
        timeout=5.0,
    )
    response.raise_for_status()
    documents = response.json().get("documents", [])
    if not documents:
        return None
    place = documents[0]
    return {"latitude": float(place["y"]), "longitude": float(place["x"])}


def reverse_geocode(latitude: float, longitude: float) -> dict | None:
    """좌표(위도/경도)로 카카오 좌표->행정구역 API를 호출해 시도/시군구명을 반환한다."""
    if not KAKAO_REST_API_KEY:
        raise RuntimeError(
            "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    response = httpx.get(
        COORD_TO_REGION_URL,
        params={"x": longitude, "y": latitude},
        headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
        timeout=5.0,
    )
    response.raise_for_status()
    documents = response.json().get("documents", [])
    # region_type "H"(행정동) 우선, 없으면 "B"(법정동) 사용
    region = next((d for d in documents if d.get("region_type") == "H"), None) or (
        documents[0] if documents else None
    )
    if not region:
        return None
    return {
        "areaNm": region.get("region_1depth_name"),
        "signguNm": region.get("region_2depth_name"),
    }


def search_category_nearby(
    latitude: float,
    longitude: float,
    radius: int,
    category_group_code: str,
) -> list[dict]:
    """좌표 기준 반경(radius, m) 내 카카오 카테고리 검색 결과를 조회한다.

    카카오 카테고리 검색은 반경 최대 20,000m, 페이지당 최대 15건 x 최대 3페이지
    (총 45건)로 제한되므로 그 안에서 페이지네이션한다.
    """
    if not KAKAO_REST_API_KEY:
        raise RuntimeError(
            "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    documents: list[dict] = []
    for page in range(1, 4):
        response = httpx.get(
            CATEGORY_SEARCH_URL,
            params={
                "category_group_code": category_group_code,
                "x": longitude,
                "y": latitude,
                "radius": min(radius, 20000),
                "sort": "distance",
                "page": page,
                "size": 15,
            },
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=5.0,
        )
        response.raise_for_status()
        body = response.json()
        documents.extend(body.get("documents", []))
        if body.get("meta", {}).get("is_end", True):
            break

    return [
        {
            "id": doc.get("id"),
            "name": doc.get("place_name"),
            "address": doc.get("road_address_name") or doc.get("address_name"),
            "latitude": float(doc["y"]) if doc.get("y") else None,
            "longitude": float(doc["x"]) if doc.get("x") else None,
            "distance": float(doc["distance"]) if doc.get("distance") else None,
            "tel": doc.get("phone") or None,
            "categoryGroupCode": doc.get("category_group_code"),
        }
        for doc in documents
    ]
