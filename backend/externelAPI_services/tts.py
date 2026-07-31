import os


def synthesize_voice(script: str, language: str, filename_seed: str) -> dict:
    provider = os.getenv("TTS_PROVIDER", "").strip().lower()
    if not provider:
        return {
            "audioUrl": None,
            "file_path": None,
            "provider": None,
            "reason": "TTS_PROVIDER_NOT_CONFIGURED",
        }

    # The provider adapter is intentionally isolated here so Google/Naver/OpenAI
    # TTS can be added without touching presentation_api or business orchestration.
    return {
        "audioUrl": None,
        "file_path": None,
        "provider": provider,
        "reason": "TTS_PROVIDER_ADAPTER_NOT_IMPLEMENTED",
    }
