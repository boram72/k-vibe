# 한국관광공사 api 연결 및 호출. https://api.visitkorea.or.kr/#/useUtilExercises에서 데이터 조회
# - 관광지별 연관 관광지 정보 서비스(TarRlteTarService1)의 지역기반 조회(areaBasedList1)로
#   사용자 현위치가 속한 시군구의 연관관광지 추천 목록을 조회한다(areaCd/signguCd 필요).
#   인증키 필요(공공데이터포털에서 발급, .env의 TOUR_API_KEY).
# - 편의점/약국/은행(ATM) 등 편의시설은 TourAPI에 해당 카테고리가 없어 카카오 로컬 API로
#   조회한다 -> externelAPI_services/amenities.py 참고.
import json
from datetime import date, timedelta
from pathlib import Path

import httpx

from config.configure import TOUR_API_KEY
from externelAPI_services import kakaomap

RELATED_ATTRACTIONS_AREA_BASED_URL = "https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1"

AREA_CODES_PATH = Path(__file__).parent / "data" / "tour_area_codes.json"


def _load_area_codes() -> list[dict]:
    with open(AREA_CODES_PATH, encoding="utf-8") as f:
        return json.load(f)


def find_area_signgu_code(area_nm: str, signgu_nm: str) -> dict | None:
    """카카오 역지오코딩의 시도/시군구명을 TourAPI 지역코드(areaCd/signguCd)로 변환한다.

    화성시 동탄구처럼 행정구역이 구 단위로 쪼개진 시/군은 카카오가 "시 구" 형태의
    복합명을 반환하지만, TourAPI 지역코드 테이블엔 하위 구 단위 코드가 없는 경우가
    있다. 완전 일치가 실패하면 마지막 토큰(하위 구)을 떼고 상위 시/군명만으로
    재시도한다.
    """
    rows = _load_area_codes()
    for row in rows:
        if row["areaNm"] == area_nm and row["signguNm"] == signgu_nm:
            return {"areaCd": row["areaCd"], "signguCd": row["signguCd"]}

    if " " in signgu_nm:
        parent_signgu_nm = signgu_nm.rsplit(" ", 1)[0]
        for row in rows:
            if row["areaNm"] == area_nm and row["signguNm"] == parent_signgu_nm:
                return {"areaCd": row["areaCd"], "signguCd": row["signguCd"]}

    return None


def _fetch_related_attractions_page(
    area_cd: str, signgu_cd: str, base_ym: str, num_of_rows: int
) -> list[dict]:
    params = {
        "serviceKey": TOUR_API_KEY,
        "numOfRows": num_of_rows,
        "pageNo": 1,
        "MobileOS": "ETC",
        "MobileApp": "KVibe",
        "_type": "json",
        "baseYm": base_ym,
        "areaCd": area_cd,
        "signguCd": signgu_cd,
    }
    response = httpx.get(RELATED_ATTRACTIONS_AREA_BASED_URL, params=params, timeout=5.0)
    response.raise_for_status()
    body = response.json().get("response", {}).get("body", {})
    items = body.get("items", "")
    if not items:
        return []
    item_list = items["item"]
    if isinstance(item_list, dict):
        item_list = [item_list]

    return [
        {
            "attractionName": item.get("tAtsNm"),
            "relatedContentId": item.get("rlteTatsCd"),
            "relatedName": item.get("rlteTatsNm"),
            "relatedAreaName": item.get("rlteRegnNm"),
            "relatedSignguName": item.get("rlteSignguNm"),
            "categoryLarge": item.get("rlteCtgryLclsNm"),
            "categoryMedium": item.get("rlteCtgryMclsNm"),
            "categorySmall": item.get("rlteCtgrySclsNm"),
            "rank": int(item["rlteRank"]) if item.get("rlteRank") else None,
        }
        for item in item_list
    ]


def find_related_attractions(
    latitude: float,
    longitude: float,
    num_of_rows: int = 30,
) -> list[dict]:
    """현위치 좌표 기준으로 시군구를 알아낸 뒤, 그 지역의 연관관광지 추천 목록을 조회한다.

    TarRlteTarService1은 데이터가 매월 8일 갱신되므로, 이번 달 데이터가 아직 없으면
    지난 달 데이터로 폴백한다.
    """
    if not TOUR_API_KEY:
        raise RuntimeError(
            "TOUR_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )

    region = kakaomap.reverse_geocode(latitude, longitude)
    if not region:
        return []
    codes = find_area_signgu_code(region["areaNm"], region["signguNm"])
    if not codes:
        return []

    this_month = date.today().replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    for base_ym in (this_month.strftime("%Y%m"), last_month.strftime("%Y%m")):
        result = _fetch_related_attractions_page(
            codes["areaCd"], codes["signguCd"], base_ym, num_of_rows
        )
        if result:
            return result
    return []
