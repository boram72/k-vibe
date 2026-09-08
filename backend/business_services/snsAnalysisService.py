import json
import math
import re

from ai_services import gemini_client, groq_client, openai_client, prompttemplate
from data_repositories import analysisCandidateInfo
from externelAPI_services import youtube

# Groq -> Gemini -> OpenAI 순으로 시도하고, 셋 다 결과가 없으면(키 미설정 포함)
# 규칙기반 워커(analysisCandidateInfo)로 최종 폴백한다. 각 client.complete()는
# 키가 없거나 호출이 실패하면 빈 문자열을 반환하도록 이미 구현되어 있어
# 여기서는 그 결과가 비어있는지만 확인하면 됨.
_AI_PROVIDERS = (
    ("groq", groq_client),
    ("gemini", gemini_client),
    ("openai", openai_client),
)


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


def _normalize_ai_place(raw: dict, locale: str) -> dict | None:
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
        reason = "AI가 영상 제목에서 추출한 장소 후보입니다." if locale == "ko" else "Candidate extracted from the video title by AI."

    return {
        "name": name.strip(),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "confidence": confidence,
        "reason": reason.strip(),
        "category": raw.get("category") if isinstance(raw.get("category"), str) else "other",
    }


def _extract_places_with_ai(title: str, locale: str) -> tuple[list[dict], str | None]:
    """Groq -> Gemini -> OpenAI 순으로 시도해 첫 성공 결과를 반환한다.

    반환값은 (장소 목록, 사용된 provider 이름). 셋 다 결과가 없으면 ([], None)이라
    호출부(analyze_sns_url)가 규칙기반 워커로 최종 폴백할 수 있다.
    """
    if not title:
        return [], None

    prompt = prompttemplate.build_spot_extraction_prompt(title)

    for provider_name, client in _AI_PROVIDERS:
        content = client.complete(prompt)
        raw_places = _extract_json_array(content)
        places: list[dict] = []

        for raw in raw_places:
            if not isinstance(raw, dict):
                continue
            place = _normalize_ai_place(raw, locale)
            if place:
                places.append(place)

        if places:
            return places[:6], provider_name

    return [], None


def analyze_sns_url(youtube_url: str, locale: str) -> dict:
    video_id = youtube.extract_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError("INVALID_YOUTUBE_URL")

    safe_locale = _locale(locale)
    title = youtube.fetch_youtube_title(youtube_url)
    fallback_title = "백엔드 K-콘텐츠 스팟 분석" if safe_locale == "ko" else "Backend K-content spot analysis"
    analysis_title = title or video_id
    ai_places, ai_source = _extract_places_with_ai(analysis_title, safe_locale)
    if ai_places and ai_source:
        return {
            "videoId": video_id,
            "video_id": video_id,
            "title": title or fallback_title,
            "places": ai_places,
            "cached": False,
            "source": ai_source,
        }

    return {
        "videoId": video_id,
        "video_id": video_id,
        "title": title or fallback_title,
        "places": analysisCandidateInfo.match_places(analysis_title, video_id, safe_locale),
        "cached": False,
        "source": "worker",
    }
