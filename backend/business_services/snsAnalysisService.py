import json
import math
import re

from ai_services import groq_client, prompttemplate
from data_repositories import analysisCandidateInfo
from externelAPI_services import youtube


def _locale(value: str) -> str:
    return value if value in {"ko", "en"} else "en"


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

    prompt = prompttemplate.build_spot_extraction_prompt(title)
    content = groq_client.complete(prompt)
    raw_places = _extract_json_array(content)
    places: list[dict] = []

    for raw in raw_places:
        if not isinstance(raw, dict):
            continue
        place = _normalize_groq_place(raw, locale)
        if place:
            places.append(place)

    return places[:6]


def analyze_sns_url(youtube_url: str, locale: str) -> dict:
    video_id = youtube.extract_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError("INVALID_YOUTUBE_URL")

    safe_locale = _locale(locale)
    title = youtube.fetch_youtube_title(youtube_url)
    fallback_title = "백엔드 K-콘텐츠 스팟 분석" if safe_locale == "ko" else "Backend K-content spot analysis"
    analysis_title = title or video_id
    groq_places = _extract_places_with_groq(analysis_title, safe_locale)
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
        "places": analysisCandidateInfo.match_places(analysis_title, video_id, safe_locale),
        "cached": False,
        "source": "worker",
    }
