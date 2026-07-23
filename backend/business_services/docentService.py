from business_services import createDocentVoice
from data_repositories import docentinfo


def _stored_audio_url(name: str, language: str) -> str | None:
    try:
        docent = docentinfo.get_docent(name)
        if docent:
            return docent.get(language)
    except Exception:
        return None
    return None


def get_docent_guide(name: str, language: str = "korean") -> dict:
    normalized = createDocentVoice.normalize_language(language)
    audio_url = _stored_audio_url(name, normalized)

    return {
        "name": name,
        "language": normalized,
        "audioUrl": audio_url,
        "file_path": audio_url,
        "script": createDocentVoice.build_docent_script(name, normalized),
        "source": "backend" if audio_url else "backend-script",
    }


def create_docent_voice(name: str, language: str = "korean") -> dict:
    return createDocentVoice.create_docent_voice(name, language)
