from urllib.parse import parse_qs, urlparse

import httpx

ANALYSIS_PLACES = {
    "seongsu": {
        "ko": {
            "name": "성수 카페거리",
            "reason": "카페 거리, 팝업스토어, 크리에이터 여행 영상에서 자주 보이는 장면과 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Seongsu Cafe Street",
            "reason": "Common visual match for cafe streets, pop-up shops, and creator travel clips.",
        },
        "lat": 37.5447,
        "lng": 127.0564,
        "confidence": 0.92,
    },
    "gyeongbokgung": {
        "ko": {
            "name": "경복궁",
            "reason": "K-드라마와 관광 영상에 자주 등장하는 서울 대표 랜드마크 후보입니다.",
        },
        "en": {
            "name": "Gyeongbokgung Palace",
            "reason": "High-signal Seoul landmark frequently shown in K-drama and tourism videos.",
        },
        "lat": 37.5796,
        "lng": 126.977,
        "confidence": 0.87,
    },
    "gwangjang": {
        "ko": {
            "name": "광장시장 먹자골목",
            "reason": "간식, 길거리 음식, 시장 장면이 포함된 콘텐츠에 어울리는 음식시장 후보입니다.",
        },
        "en": {
            "name": "Gwangjang Market Food Alley",
            "reason": "Food-market candidate for snack, street-food, and market-scene content.",
        },
        "lat": 37.5701,
        "lng": 126.9996,
        "confidence": 0.78,
    },
    "namsan": {
        "ko": {
            "name": "남산타워",
            "reason": "서울 전경, 야경, 관광 브이로그 맥락에 잘 맞는 전망 명소 후보입니다.",
        },
        "en": {
            "name": "N Seoul Tower",
            "reason": "A strong viewpoint candidate for Seoul skyline and night-view travel videos.",
        },
        "lat": 37.5512,
        "lng": 126.9882,
        "confidence": 0.82,
    },
}

KEYWORD_MAP = {
    "seongsu": "seongsu",
    "성수": "seongsu",
    "gyeongbok": "gyeongbokgung",
    "경복궁": "gyeongbokgung",
    "gwangjang": "gwangjang",
    "광장시장": "gwangjang",
    "market": "gwangjang",
    "namsan": "namsan",
    "남산": "namsan",
    "tower": "namsan",
}


def extract_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host == "youtu.be":
        return parsed.path.strip("/") or None
    if host.endswith("youtube.com"):
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        for prefix in ("/shorts/", "/embed/"):
            if parsed.path.startswith(prefix):
                return parsed.path.removeprefix(prefix).split("/")[0]
    return None


def _locale(value: str) -> str:
    return value if value in {"ko", "en"} else "en"


def _fetch_youtube_title(url: str) -> str:
    try:
        response = httpx.get(
            "https://www.youtube.com/oembed",
            params={"url": url, "format": "json"},
            timeout=4,
        )
        response.raise_for_status()
        data = response.json()
        title = data.get("title")
        return title if isinstance(title, str) else ""
    except Exception:
        return ""


def _place_payload(place_id: str, locale: str) -> dict:
    place = ANALYSIS_PLACES[place_id]
    text = place.get(locale, place["en"])
    return {
        "name": text["name"],
        "lat": place["lat"],
        "lng": place["lng"],
        "confidence": place["confidence"],
        "reason": text["reason"],
    }


def _match_places(title: str, locale: str) -> list[dict]:
    normalized = title.lower()
    matched_ids = []
    for keyword, place_id in KEYWORD_MAP.items():
        if keyword.lower() in normalized and place_id not in matched_ids:
            matched_ids.append(place_id)

    if not matched_ids:
        matched_ids = ["seongsu", "gyeongbokgung", "gwangjang"]

    return [_place_payload(place_id, locale) for place_id in matched_ids[:6]]


def analyze_sns_url(youtube_url: str, locale: str) -> dict:
    video_id = extract_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError("INVALID_YOUTUBE_URL")

    safe_locale = _locale(locale)
    title = _fetch_youtube_title(youtube_url)
    fallback_title = "백엔드 K-콘텐츠 스팟 분석" if safe_locale == "ko" else "Backend K-content spot analysis"

    return {
        "videoId": video_id,
        "video_id": video_id,
        "title": title or fallback_title,
        "places": _match_places(title or video_id, safe_locale),
        "cached": False,
        "source": "worker",
    }
