# 한국관광공사 api 연결 및 호출. https://api.visitkorea.or.kr/#/useUtilExercises에서 데이터 조회
# - 관광지별 연관 관광지 정보 서비스(TarRlteTarService1)의 지역기반 조회(areaBasedList1)로
#   사용자 현위치가 속한 시군구의 연관관광지 추천 목록을 조회한다(areaCd/signguCd 필요).
#   인증키 필요(공공데이터포털에서 발급, .env의 TOUR_API_KEY).
# - K-Vibe지도(MapPage)의 현위치 주변 관광명소는 위치기반 관광정보 조회 서비스
#   (KorService2/locationBasedList2)를 사용한다. TarRlteTarService1과 달리 좌표
#   (mapx/mapy)를 직접 반환하므로 지도 핀 표시가 가능하다.
# - 편의점/약국/은행(ATM) 등 편의시설은 TourAPI에 해당 카테고리가 없어 카카오 로컬 API로
#   조회한다 -> externelAPI_services/amenities.py 참고.
import json
from datetime import date, timedelta
from pathlib import Path

import httpx

from config.configure import TOUR_API_KEY
from externelAPI_services import kakaomap

RELATED_ATTRACTIONS_AREA_BASED_URL = "https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1"

# 프론트 SUPPORTED_LOCALES(ko/en/ja/zh)에 대응하는 TourAPI 언어별 서비스.
# 인증키(TOUR_API_KEY)는 언어 상관없이 동일한 키를 쓴다. 지원 안 하는 locale은 한국어로 폴백.
LOCALE_TO_SERVICE = {
    "ko": "KorService2",
    "en": "EngService2",
    "ja": "JpnService2",
    "zh": "ChsService2",  # 중문간체
}


def _location_based_list_url(locale: str | None) -> str:
    service = LOCALE_TO_SERVICE.get(locale, "KorService2")
    return f"https://apis.data.go.kr/B551011/{service}/locationBasedList2"

AREA_CODES_PATH = Path(__file__).parent / "data" / "tour_area_codes.json"

# TourAPI contentTypeId -> 프론트엔드 PlaceCategory(src/types/place.ts) 매핑.
# 25(여행코스)는 단일 지점이 아니라 조회 대상에서 제외한다(find_nearby_places 참고).
CONTENT_TYPE_TO_CATEGORY = {
    "12": "culture",  # 관광지
    "14": "culture",  # 문화시설
    "15": "fun",  # 축제공연행사
    "28": "fun",  # 레포츠
    "32": "stay",  # 숙박
    "38": "fun",  # 쇼핑
    "39": "food",  # 음식점
}


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
            "attractionContentId": item.get("tAtsCd"),
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


def _fetch_nearby_places_page(
    latitude: float, longitude: float, radius: int, num_of_rows: int, locale: str | None
) -> list[dict]:
    params = {
        "serviceKey": TOUR_API_KEY,
        "numOfRows": num_of_rows,
        "pageNo": 1,
        "MobileOS": "ETC",
        "MobileApp": "KVibe",
        "_type": "json",
        "arrange": "E",  # 거리순 정렬 (mapX/mapY 필수)
        "mapX": longitude,
        "mapY": latitude,
        "radius": min(radius, 20000),  # locationBasedList2 최대 반경
    }
    response = httpx.get(_location_based_list_url(locale), params=params, timeout=5.0)
    response.raise_for_status()
    body = response.json().get("response", {}).get("body", {})
    items = body.get("items", "")
    if not items:
        return []
    item_list = items["item"]
    if isinstance(item_list, dict):
        item_list = [item_list]
    return item_list


def find_nearby_places(
    latitude: float,
    longitude: float,
    radius: int = 10000,
    num_of_rows: int = 30,
    locale: str | None = None,
) -> list[dict]:
    """현위치 좌표 기준 반경 내 관광명소를 조회한다 (K-Vibe지도용).

    locale(ko/en/ja/zh)에 따라 TourAPI 언어별 서비스로 요청해 장소명/주소를
    해당 언어로 받는다. 프론트엔드 Place 타입(src/types/place.ts)과 필드가
    1:1 대응하도록 변환해서 반환한다 - 백엔드 응답 형태를 바꾸지 않고 프론트가
    이미 호출 중인 GET /places 규격을 그대로 채운다.
    """
    if not TOUR_API_KEY:
        raise RuntimeError(
            "TOUR_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )

    raw_items = _fetch_nearby_places_page(latitude, longitude, radius, num_of_rows, locale)

    places = []
    for item in raw_items:
        content_type_id = item.get("contenttypeid")
        if content_type_id == "25":  # 여행코스: 단일 지점이 아니라 제외
            continue
        mapx, mapy = item.get("mapx"), item.get("mapy")
        if not mapx or not mapy:
            continue
        places.append(
            {
                "id": item.get("contentid"),
                "name": item.get("title"),
                "category": CONTENT_TYPE_TO_CATEGORY.get(content_type_id, "culture"),
                "address": item.get("addr1") or "",
                "lat": float(mapy),
                "lng": float(mapx),
                "imageUrl": item.get("firstimage") or None,
                "distanceM": round(float(item["dist"])) if item.get("dist") else None,
                "tags": [],
            }
        )
    return places
