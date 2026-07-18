# 경로계산할때 kakaomap api호출할거라 api연결interface상세
# - Kakao Local API(키워드 검색)로 장소명 -> 좌표(위도/경도) 변환.
#   REST API 키 필요(카카오 개발자 콘솔에서 발급, .env의 KAKAO_REST_API_KEY).
import httpx

from config.configure import KAKAO_REST_API_KEY

KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


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
