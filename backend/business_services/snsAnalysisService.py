import json
import re

from ai_services import gemini_client, groq_client, openai_client, prompttemplate
from data_repositories import analysisCandidateInfo
from externelAPI_services import kakaomap, youtube

# Groq -> Gemini -> OpenAI 순으로 시도하고, 셋 다 결과가 없으면(키 미설정 포함)
# 규칙기반 워커(analysisCandidateInfo)로 최종 폴백한다. 각 client.complete()는
# 키가 없거나 호출이 실패하면 빈 문자열을 반환하도록 이미 구현되어 있어
# 여기서는 그 결과가 비어있는지만 확인하면 됨.
_AI_PROVIDERS = (
    ("groq", groq_client),
    ("gemini", gemini_client),
    ("openai", openai_client),
)

_DEFAULT_CONFIDENCE = 0.75
_MAX_PLACES = 6


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


def _extract_place_names(content: str) -> list[str]:
    names: list[str] = []
    for item in _extract_json_array(content):
        if isinstance(item, str) and item.strip() and item.strip() not in names:
            names.append(item.strip())
    return names[:_MAX_PLACES]


def _extract_names_from_text(text: str) -> tuple[list[str], str | None]:
    """자막 텍스트에서 Groq -> Gemini -> OpenAI 순으로 장소명을 추출한다."""
    if not text:
        return [], None

    prompt = prompttemplate.build_place_name_extraction_from_text_prompt(text)
    for provider_name, client in _AI_PROVIDERS:
        names = _extract_place_names(client.complete(prompt))
        if names:
            return names, provider_name

    return [], None


def _extract_names_from_video(video_url: str) -> tuple[list[str], str | None]:
    """자막이 없거나 자막에서 장소를 못 찾았을 때 Gemini 네이티브 영상 분석으로 폴백한다."""
    prompt = prompttemplate.build_place_name_extraction_from_video_prompt()
    names = _extract_place_names(gemini_client.analyze_video(video_url, prompt))
    return (names, "gemini") if names else ([], None)


def _geocode_place_names(names: list[str], locale: str) -> list[dict]:
    """AI가 추출한 장소명을 카카오 로컬 검색으로 좌표 변환한다. 좌표를 못 찾은 이름은 제외한다."""
    reason = "AI가 영상에서 추출한 장소 후보입니다." if locale == "ko" else "Candidate extracted from the video by AI."
    places: list[dict] = []
    for name in names:
        try:
            coordinates = kakaomap.search_coordinates(name)
        except Exception:
            continue
        if not coordinates:
            continue
        places.append(
            {
                "name": name,
                "lat": round(coordinates["latitude"], 6),
                "lng": round(coordinates["longitude"], 6),
                "confidence": _DEFAULT_CONFIDENCE,
                "reason": reason,
            }
        )
    return places


def analyze_sns_url(youtube_url: str, locale: str) -> dict:
    video_id = youtube.extract_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError("INVALID_YOUTUBE_URL")

    safe_locale = _locale(locale)
    title = youtube.fetch_youtube_title(youtube_url)
    fallback_title = "백엔드 K-콘텐츠 스팟 분석" if safe_locale == "ko" else "Backend K-content spot analysis"
    analysis_title = title or video_id

    # 자막 우선 -> 자막이 없거나 장소를 못 찾으면 Gemini 네이티브 영상 분석으로 폴백
    transcript = youtube.fetch_youtube_transcript(video_id)
    names, source = _extract_names_from_text(transcript)
    if not names:
        names, source = _extract_names_from_video(youtube_url)

    if names and source:
        places = _geocode_place_names(names, safe_locale)
        if places:
            return {
                "videoId": video_id,
                "video_id": video_id,
                "title": title or fallback_title,
                "places": places,
                "cached": False,
                "source": source,
            }

    return {
        "videoId": video_id,
        "video_id": video_id,
        "title": title or fallback_title,
        "places": analysisCandidateInfo.match_places(analysis_title, video_id, safe_locale),
        "cached": False,
        "source": "worker",
    }
