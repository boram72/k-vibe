from data_repositories import docentinfo, locationinfo
from externelAPI_services import tts

LANGUAGE_BY_LOCALE = {
    "ko": "korean",
    "en": "english",
    "ja": "japanese",
    "zh": "chinese",
}


def normalize_language(language: str) -> str:
    return LANGUAGE_BY_LOCALE.get(language, language)


def _location_context(name: str) -> dict | None:
    try:
        return locationinfo.get_location(name)
    except Exception:
        return None


def build_docent_script(name: str, language: str) -> str:
    location = _location_context(name) or {}
    town = location.get("town")
    suffix = f" {town}에 있는 장소입니다." if town and language == "korean" else ""

    if language == "korean":
        return f"{name}에 도착했습니다.{suffix} 주변 동선과 사진 포인트를 확인하면서 천천히 둘러보세요."
    if language == "japanese":
        return f"{name}に到着しました。周辺の動線と写真スポットを確認しながら、ゆっくり巡ってください。"
    if language == "chinese":
        return f"你已到达{name}。请确认周边路线和拍照点，慢慢游览。"
    return f"You have arrived at {name}. Take a moment to check the route, nearby context, and photo spots."


def create_docent_voice(name: str, language: str = "korean") -> dict:
    normalized = normalize_language(language)
    script = build_docent_script(name, normalized)
    result = tts.synthesize_voice(script, normalized, name)
    audio_url = result.get("audioUrl") or result.get("file_path")
    persisted = False

    if audio_url:
        try:
            docentinfo.upsert_docent_voice(name, normalized, audio_url)
            persisted = True
        except Exception:
            persisted = False

    return {
        "name": name,
        "language": normalized,
        "audioUrl": audio_url,
        "file_path": audio_url,
        "script": script,
        "persisted": persisted,
        "source": "tts" if audio_url else "tts-pending",
        "provider": result.get("provider"),
        "reason": result.get("reason"),
    }
