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
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

import httpx

from config.configure import TOUR_API_KEY
from externelAPI_services import kakaomap

RELATED_ATTRACTIONS_AREA_BASED_URL = "https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1"
DETAIL_COMMON_URL = "https://apis.data.go.kr/B551011/KorService2/detailCommon2"
DETAIL_INTRO_URL = "https://apis.data.go.kr/B551011/KorService2/detailIntro2"
CATEGORY_CODE_URL = "https://apis.data.go.kr/B551011/KorService2/categoryCode2"

# PLACE_DETAIL_INTEGRATION_REQUEST.md 참고 — contentTypeId별로 영업시간/휴무일
# 필드명이 다르다. 체크인/체크아웃(32)·공연시간(15)은 이 2필드 패턴과 달라 별도 처리.
BUSINESS_HOURS_FIELD_MAP = {
    "12": ("usetime", "restdate"),  # 관광지
    "14": ("usetimeculture", "restdateculture"),  # 문화시설
    "28": ("usetimeleports", "restdateleports"),  # 레포츠
    "38": ("opentime", "restdateshopping"),  # 쇼핑
    "39": ("opentimefood", "restdatefood"),  # 음식점
}

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
#
# 2026-09 QA 피드백 반영 — 기존엔 15(축제행사)/28(레포츠)/38(쇼핑)을 전부 "fun"
# 하나로 뭉쳐서 사용자가 축제/쇼핑을 따로 찾을 수 없었음(실제로는 TourAPI에 세
# 콘텐츠타입 모두 데이터가 있는데 카테고리 구분만 안 해준 것 — 서울 도심 기준
# 100건 중 15번 7건/38번 14건 확인). "관광지/문화/음식/숙소/축제/쇼핑" 6개로
# 재분류(대화로 확정): 12(관광지)+28(레포츠, 도심 기준 데이터 희소해 관광지에
# 편입)는 "attraction", 14(문화시설)는 기존 "culture" 그대로 유지(범위만 좁아짐),
# 15(축제행사)는 신규 "festival", 38(쇼핑)은 신규 "shopping"으로 분리.
CONTENT_TYPE_TO_CATEGORY = {
    "12": "attraction",  # 관광지
    "14": "culture",  # 문화시설
    "15": "festival",  # 축제행사
    "28": "attraction",  # 레포츠 (관광지에 편입)
    "32": "stay",  # 숙박
    "38": "shopping",  # 쇼핑
    "39": "food",  # 음식점
}

# 외국어 서비스(EngService2/JpnService2/ChsService2)는 KorService2와 완전히 다른
# contentTypeId 번호 체계를 쓴다(BACKEND_REQUESTS.md 3번, 실측 확인된 대응표).
# 이 매핑이 없으면 find_nearby_places()가 locale != ko일 때 전부 매칭 실패해
# CONTENT_TYPE_TO_CATEGORY.get(...)의 기본값("culture") 하나로 뭉개진다.
FOREIGN_CONTENT_TYPE_TO_CATEGORY = {
    "75": "attraction",  # 레포츠 (KorService2 28)
    "76": "attraction",  # 관광지 (KorService2 12)
    "78": "culture",  # 문화시설 (KorService2 14)
    "79": "shopping",  # 쇼핑 (KorService2 38)
    "80": "stay",  # 숙박 (KorService2 32)
    "82": "food",  # 음식점 (KorService2 39)
    "85": "festival",  # 축제공연행사 (KorService2 15)
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

    # locale != ko(en/ja/zh)는 KorService2와 다른 contentTypeId 체계를 쓰므로
    # 카테고리 매핑 테이블도 그에 맞춰 골라야 한다(BACKEND_REQUESTS.md 3번).
    category_map = CONTENT_TYPE_TO_CATEGORY if locale in (None, "ko") else FOREIGN_CONTENT_TYPE_TO_CATEGORY

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
                "category": category_map.get(content_type_id, "culture"),
                "address": item.get("addr1") or "",
                "lat": float(mapy),
                "lng": float(mapx),
                "imageUrl": item.get("firstimage") or None,
                "distanceM": round(float(item["dist"])) if item.get("dist") else None,
                "tags": [],
            }
        )
    return places


def _tour_api_common_params() -> dict:
    return {
        "serviceKey": TOUR_API_KEY,
        "MobileOS": "ETC",
        "MobileApp": "KVibe",
        "_type": "json",
    }


def _first_item(body: dict) -> dict | None:
    items = body.get("items", "")
    if not items:
        return None
    item = items["item"]
    return item[0] if isinstance(item, list) else item


def _fetch_detail_common(content_id: str) -> dict | None:
    # defaultYN/overviewYN은 TourAPI 공식 예제 문서에 있는 optional 파라미터라 최초 구현 때
    # 따라 넣었으나, 현재 서비스키/버전에서는 이 값을 보내면 INVALID_REQUEST_PARAMETER_ERROR로
    # 요청 자체가 항상 실패한다(BACKEND_REQUESTS.md 4번, 실측 확인됨). 빼도 overview 필드는
    # 기본으로 포함되어 오므로 제거한다.
    params = {**_tour_api_common_params(), "contentId": content_id}
    response = httpx.get(DETAIL_COMMON_URL, params=params, timeout=5.0)
    response.raise_for_status()
    return _first_item(response.json().get("response", {}).get("body", {}))


def _fetch_detail_intro(content_id: str, content_type_id: str) -> dict:
    params = {**_tour_api_common_params(), "contentId": content_id, "contentTypeId": content_type_id}
    response = httpx.get(DETAIL_INTRO_URL, params=params, timeout=5.0)
    response.raise_for_status()
    return _first_item(response.json().get("response", {}).get("body", {})) or {}


@lru_cache(maxsize=256)
def _fetch_category_name(cat1: str, cat2: str, cat3: str) -> str | None:
    """cat3(소분류) 코드 -> 한글 카테고리명. 자주 조회되는 값이라 프로세스 내 캐싱."""
    params = {**_tour_api_common_params(), "cat1": cat1, "cat2": cat2, "cat3": cat3}
    response = httpx.get(CATEGORY_CODE_URL, params=params, timeout=5.0)
    response.raise_for_status()
    item = _first_item(response.json().get("response", {}).get("body", {}))
    return item.get("name") if item else None


_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _clean_text(text: str | None) -> str | None:
    """TourAPI 텍스트 필드(usetime/overview 등)에 <br> 같은 HTML 태그가 그대로 섞여
    내려오는 케이스를 정리한다. <br>은 줄바꿈으로, 그 외 태그는 제거한다."""
    if not text:
        return text
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = _HTML_TAG_RE.sub("", text)
    return text.strip() or None


def _normalize_business_hours(content_type_id: str | None, intro: dict) -> str | None:
    if content_type_id == "32":  # 숙박: 체크인/체크아웃
        checkin, checkout = intro.get("checkintime"), intro.get("checkouttime")
        if checkin and checkout:
            return _clean_text(f"체크인 {checkin} · 체크아웃 {checkout}")
        return _clean_text(checkin or checkout or None)

    if content_type_id == "15":  # 축제공연행사: 공연시간
        return _clean_text(intro.get("playtime") or intro.get("usetimefestival") or None)

    fields = BUSINESS_HOURS_FIELD_MAP.get(content_type_id)
    if not fields:
        return None
    hours_field, closed_field = fields
    hours = intro.get(hours_field)
    if not hours:
        return None
    closed = intro.get(closed_field)
    return _clean_text(f"{hours} ({closed} 휴무)" if closed else hours)


def get_place_detail(content_id: str) -> dict | None:
    """장소 상세시트(전화번호/영업시간/카테고리 태그) 온디맨드 조회.

    detailCommon2(전화번호/개요/분류코드) + detailIntro2(콘텐츠 타입별 영업시간,
    정규화 필요) + categoryCode2(cat3 코드 -> 한글명) 세 개를 조합한다.
    PLACE_DETAIL_INTEGRATION_REQUEST.md 참고.
    """
    if not TOUR_API_KEY:
        raise RuntimeError(
            "TOUR_API_KEY 환경변수가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )

    common = _fetch_detail_common(content_id)
    if common is None:
        return None

    content_type_id = common.get("contenttypeid")
    cat1, cat2, cat3 = common.get("cat1"), common.get("cat2"), common.get("cat3")
    tel = common.get("tel") or None

    # detailIntro2/categoryCode2/카카오 전화번호 폴백은 셋 다 detailCommon2 응답에만
    # 의존하고 서로는 독립적이다. 순차 호출 시 상세시트 하나 여는데 최대 4번의
    # 왕복(각 timeout=5.0)이 누적돼 실측 2.7초가 걸렸다 - 스레드로 동시에 쏴서
    # 총 소요시간을 "합"이 아니라 "가장 느린 호출 1건" 수준으로 줄인다.
    with ThreadPoolExecutor(max_workers=3) as executor:
        intro_future = (
            executor.submit(_fetch_detail_intro, content_id, content_type_id) if content_type_id else None
        )
        category_future = (
            executor.submit(_fetch_category_name, cat1, cat2, cat3) if cat1 and cat2 and cat3 else None
        )
        # TourAPI가 tel을 안 주는 경우가 많다(소규모 식당/매장 등). 카카오 로컬
        # 키워드 검색으로 보완한다 - 실패해도 None이라 기존 폴백 UI 그대로 유지.
        phone_future = (
            None
            if tel
            else executor.submit(kakaomap.get_phone_number, name=common.get("title"), address=common.get("addr1"))
        )

        intro = intro_future.result() if intro_future else {}
        category_name = category_future.result() if category_future else None
        phone = tel or (phone_future.result() if phone_future else None)

    return {
        "phone": phone,
        "businessHours": _normalize_business_hours(content_type_id, intro),
        "overview": _clean_text(common.get("overview")),
        "tags": [category_name] if category_name else [],
    }
