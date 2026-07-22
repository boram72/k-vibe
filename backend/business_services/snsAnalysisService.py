import hashlib
import json
import math
import re
from urllib.parse import parse_qs, urlparse

import httpx

from config.configure import GROQ_API_KEY

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_TIMEOUT_SECONDS = 20

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
    "ikseon": {
        "ko": {
            "name": "익선동 한옥거리",
            "reason": "한옥 골목, 감성 카페, 데이트 브이로그 장면과 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Ikseon-dong Hanok Alley",
            "reason": "A strong candidate for hanok alleys, mood cafes, and date-style vlogs.",
        },
        "lat": 37.574,
        "lng": 126.9897,
        "confidence": 0.81,
    },
    "hangang_ttukseom": {
        "ko": {
            "name": "뚝섬한강공원",
            "reason": "한강 피크닉, 노을, 야외 브이로그 흐름에 어울리는 후보입니다.",
        },
        "en": {
            "name": "Ttukseom Hangang Park",
            "reason": "A riverside candidate for picnic, sunset, and outdoor vlog scenes.",
        },
        "lat": 37.5297,
        "lng": 127.069,
        "confidence": 0.8,
    },
    "seoul_sky": {
        "ko": {
            "name": "서울스카이",
            "reason": "잠실 전망, 롯데월드타워, 도시 전경 장면과 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Seoul Sky",
            "reason": "A Jamsil skyline candidate for Lotte World Tower and city-view clips.",
        },
        "lat": 37.5125,
        "lng": 127.1025,
        "confidence": 0.84,
    },
    "seokchon": {
        "ko": {
            "name": "석촌호수",
            "reason": "잠실 산책, 호수, 벚꽃·야경 장면에 어울리는 후보입니다.",
        },
        "en": {
            "name": "Seokchon Lake",
            "reason": "A walking-route candidate for Jamsil lake, cherry blossom, and night scenes.",
        },
        "lat": 37.5083,
        "lng": 127.1041,
        "confidence": 0.8,
    },
    "banpo": {
        "ko": {
            "name": "반포 세빛섬",
            "reason": "한강 야경, 다리 조명, 강변 산책 장면과 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Sebitseom Banpo",
            "reason": "A riverside candidate for Hangang night views, bridge lights, and walks.",
        },
        "lat": 37.5126,
        "lng": 126.9957,
        "confidence": 0.79,
    },
    "apgujeong": {
        "ko": {
            "name": "나이키 압구정",
            "reason": "압구정 쇼핑, 패션 거리, 스트리트 스타일 영상에 어울리는 후보입니다.",
        },
        "en": {
            "name": "Nike Apgujeong",
            "reason": "A shopping candidate for Apgujeong fashion streets and street-style clips.",
        },
        "lat": 37.5272,
        "lng": 127.0389,
        "confidence": 0.78,
    },
    "dosan": {
        "ko": {
            "name": "도산공원",
            "reason": "청담·압구정 산책, 카페, 패션 콘텐츠 흐름에 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Dosan Park",
            "reason": "A Cheongdam-Apgujeong candidate for walks, cafes, and fashion content.",
        },
        "lat": 37.5247,
        "lng": 127.0355,
        "confidence": 0.81,
    },
    "hannam": {
        "ko": {
            "name": "패션5 한남점",
            "reason": "한남동 디저트, 카페, 라이프스타일 콘텐츠에 어울리는 후보입니다.",
        },
        "en": {
            "name": "Passion 5 Hannam",
            "reason": "A Hannam dessert and lifestyle candidate for cafe-forward clips.",
        },
        "lat": 37.5346,
        "lng": 127.0002,
        "confidence": 0.78,
    },
    "samcheong": {
        "ko": {
            "name": "삼청동수제비",
            "reason": "삼청동 골목, 한식, 전통 감성 산책 영상에 어울리는 후보입니다.",
        },
        "en": {
            "name": "Samcheongdong Sujebi",
            "reason": "A Samcheong-dong candidate for Korean food and traditional walking clips.",
        },
        "lat": 37.584,
        "lng": 126.9819,
        "confidence": 0.77,
    },
    "ihwa": {
        "ko": {
            "name": "이화동 벽화마을",
            "reason": "벽화 골목, 사진 산책, 언덕 마을 장면과 잘 맞는 후보입니다.",
        },
        "en": {
            "name": "Ihwa Mural Village",
            "reason": "A photo-walk candidate for mural alleys and hillside neighborhood clips.",
        },
        "lat": 37.5804,
        "lng": 127.0074,
        "confidence": 0.76,
    },
}

KEYWORD_MAP = {
    "seongsu": ["seongsu"],
    "성수": ["seongsu"],
    "cafe": ["seongsu", "ikseon", "hannam"],
    "카페": ["seongsu", "ikseon", "hannam"],
    "gyeongbok": ["gyeongbokgung"],
    "경복궁": ["gyeongbokgung"],
    "palace": ["gyeongbokgung", "samcheong"],
    "궁": ["gyeongbokgung", "samcheong"],
    "gwangjang": ["gwangjang"],
    "광장시장": ["gwangjang"],
    "market": ["gwangjang"],
    "시장": ["gwangjang"],
    "food": ["gwangjang", "samcheong", "ikseon"],
    "맛집": ["gwangjang", "samcheong", "ikseon"],
    "먹방": ["gwangjang", "samcheong", "ikseon"],
    "namsan": ["namsan"],
    "남산": ["namsan"],
    "tower": ["namsan", "seoul_sky"],
    "전망": ["namsan", "seoul_sky"],
    "hangang": ["hangang_ttukseom", "banpo"],
    "han river": ["hangang_ttukseom", "banpo"],
    "한강": ["hangang_ttukseom", "banpo"],
    "잠실": ["seoul_sky", "seokchon"],
    "jamsil": ["seoul_sky", "seokchon"],
    "lotte": ["seoul_sky", "seokchon"],
    "석촌": ["seokchon"],
    "seokchon": ["seokchon"],
    "banpo": ["banpo"],
    "반포": ["banpo"],
    "apgujeong": ["apgujeong", "dosan"],
    "압구정": ["apgujeong", "dosan"],
    "cheongdam": ["dosan", "apgujeong"],
    "청담": ["dosan", "apgujeong"],
    "fashion": ["apgujeong", "dosan", "hannam"],
    "패션": ["apgujeong", "dosan", "hannam"],
    "hannam": ["hannam"],
    "한남": ["hannam"],
    "ikseon": ["ikseon"],
    "익선": ["ikseon"],
    "samcheong": ["samcheong", "gyeongbokgung"],
    "삼청": ["samcheong", "gyeongbokgung"],
    "ihwa": ["ihwa"],
    "이화": ["ihwa"],
}

FALLBACK_BUCKETS = [
    ["seongsu", "gyeongbokgung", "gwangjang"],
    ["namsan", "ikseon", "hangang_ttukseom"],
    ["seoul_sky", "seokchon", "banpo"],
    ["apgujeong", "dosan", "hannam"],
    ["samcheong", "ihwa", "gwangjang"],
]

SPOT_EXTRACTION_PROMPT = """당신은 한국 여행 장소 추천 전문가입니다.
아래 YouTube 영상 정보에서 등장하거나 강하게 유추할 수 있는 한국의 실제 여행 스팟을 추출하세요.

## 영상 제목
{title}

## 지시사항
- 실제 한국 여행 장소를 최대 6개 추출하세요.
- 서울, 부산처럼 넓은 지역명만 있는 항목은 제외하고 구체적인 장소명을 우선하세요.
- 각 장소의 category는 cafe, restaurant, landmark, park, shopping, culture, nature, other 중 하나입니다.
- confidence는 0.0~1.0 숫자입니다.
- lat, lng는 해당 장소의 실제 위도/경도 좌표입니다. 한국 내 실제 좌표를 소수점 4자리 이상으로 반환하세요.
- reason은 왜 이 장소로 판단했는지 짧게 설명하세요.
- 반드시 JSON 배열만 반환하세요. 설명 문장이나 마크다운은 반환하지 마세요.

[
  {{"name":"장소명","category":"cafe","confidence":0.9,"reason":"제목에서 성수 카페가 언급됨","lat":37.5447,"lng":127.0564}}
]
"""


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


def _complete_with_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        return ""

    try:
        response = httpx.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 1024,
            },
            timeout=GROQ_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        return content if isinstance(content, str) else ""
    except Exception:
        return ""


def _extract_json_array(text: str) -> list:
    if not text:
        return []
    try:
        match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
        payload = match.group(1) if match else text.strip()
        parsed = json.loads(payload)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def _to_float(value) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _is_korea_coordinate(lat: float | None, lng: float | None) -> bool:
    return lat is not None and lng is not None and 33 <= lat <= 39 and 124 <= lng <= 132


def _normalize_groq_place(raw: dict, locale: str) -> dict | None:
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        return None

    lat = _to_float(raw.get("lat"))
    lng = _to_float(raw.get("lng"))
    if not _is_korea_coordinate(lat, lng):
        return None

    confidence = _to_float(raw.get("confidence"))
    if confidence is None:
        confidence = 0.7
    confidence = max(0, min(1, confidence))

    reason = raw.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        reason = "Groq가 영상 제목에서 추출한 장소 후보입니다." if locale == "ko" else "Candidate extracted from the video title by Groq."

    return {
        "name": name.strip(),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "confidence": confidence,
        "reason": reason.strip(),
        "category": raw.get("category") if isinstance(raw.get("category"), str) else "other",
    }


def _extract_places_with_groq(title: str, locale: str) -> list[dict]:
    if not title:
        return []

    prompt = SPOT_EXTRACTION_PROMPT.format(title=title)
    content = _complete_with_groq(prompt)
    raw_places = _extract_json_array(content)
    places: list[dict] = []

    for raw in raw_places:
        if not isinstance(raw, dict):
            continue
        place = _normalize_groq_place(raw, locale)
        if place:
            places.append(place)

    return places[:6]


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


def _append_unique(target: list[str], candidates: list[str]) -> None:
    for place_id in candidates:
        if place_id in ANALYSIS_PLACES and place_id not in target:
            target.append(place_id)


def _fallback_place_ids(video_id: str) -> list[str]:
    digest = hashlib.sha256(video_id.encode("utf-8")).digest()
    start = digest[0] % len(FALLBACK_BUCKETS)
    ordered_buckets = FALLBACK_BUCKETS[start:] + FALLBACK_BUCKETS[:start]
    picked: list[str] = []
    for bucket in ordered_buckets:
        _append_unique(picked, bucket)
        if len(picked) >= 3:
            break
    return picked[:3]


def _match_places(title: str, video_id: str, locale: str) -> list[dict]:
    normalized = title.lower()
    matched_ids = []
    for keyword, place_ids in KEYWORD_MAP.items():
        if keyword.lower() in normalized:
            _append_unique(matched_ids, place_ids)

    _append_unique(matched_ids, _fallback_place_ids(video_id))

    return [_place_payload(place_id, locale) for place_id in matched_ids[:6]]


def analyze_sns_url(youtube_url: str, locale: str) -> dict:
    video_id = extract_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError("INVALID_YOUTUBE_URL")

    safe_locale = _locale(locale)
    title = _fetch_youtube_title(youtube_url)
    fallback_title = "백엔드 K-콘텐츠 스팟 분석" if safe_locale == "ko" else "Backend K-content spot analysis"
    groq_places = _extract_places_with_groq(title or video_id, safe_locale)
    if groq_places:
        return {
            "videoId": video_id,
            "video_id": video_id,
            "title": title or fallback_title,
            "places": groq_places,
            "cached": False,
            "source": "groq",
        }

    return {
        "videoId": video_id,
        "video_id": video_id,
        "title": title or fallback_title,
        "places": _match_places(title or video_id, video_id, safe_locale),
        "cached": False,
        "source": "worker",
    }
