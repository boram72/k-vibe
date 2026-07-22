from data_repositories import docentinfo

LANGUAGE_BY_LOCALE = {
    "ko": "korean",
    "en": "english",
    "ja": "japanese",
    "zh": "chinese",
}


def _normalize_language(language: str) -> str:
    return LANGUAGE_BY_LOCALE.get(language, language)


def _script_for(name: str, language: str) -> str:
    if language == "korean":
        return f"{name}에 도착했습니다. 주변 동선과 사진 포인트를 확인하면서 천천히 둘러보세요."
    if language == "japanese":
        return f"{name}に到着しました。周辺の動線と写真スポットを確認しながら、ゆっくり巡ってください。"
    if language == "chinese":
        return f"你已到达{name}。请确认周边路线和拍照点，慢慢游览。"
    return f"You have arrived at {name}. Take a moment to check the route, nearby context, and photo spots."


def get_docent_guide(name: str, language: str = "korean") -> dict:
    normalized = _normalize_language(language)
    audio_url = None

    try:
        docent = docentinfo.get_docent(name)
        if docent:
            audio_url = docent.get(normalized)
    except RuntimeError:
        audio_url = None

    return {
        "name": name,
        "language": normalized,
        "audioUrl": audio_url,
        "file_path": audio_url,
        "script": _script_for(name, normalized),
        "source": "backend" if audio_url else "backend-script",
    }
