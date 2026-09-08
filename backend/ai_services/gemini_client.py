import httpx

from config.configure import GEMINI_API_KEY

GEMINI_MODEL = "gemini-3.5-flash-lite"  # was "gemini-2.0-flash" (deprecated by Google, 404 model_not_found)
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
GEMINI_TIMEOUT_SECONDS = 20
GEMINI_VIDEO_TIMEOUT_SECONDS = 60


def complete(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return ""

    try:
        response = httpx.post(
            GEMINI_API_URL,
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
            },
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        content = parts[0].get("text") if parts else None
        return content if isinstance(content, str) else ""
    except Exception:
        return ""


def analyze_video(video_url: str, prompt: str) -> str:
    if not GEMINI_API_KEY:
        return ""

    try:
        response = httpx.post(
            GEMINI_API_URL,
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [
                    {
                        "parts": [
                            {"fileData": {"fileUri": video_url}},
                            {"text": prompt},
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
            },
            timeout=GEMINI_VIDEO_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        content = parts[0].get("text") if parts else None
        return content if isinstance(content, str) else ""
    except Exception:
        return ""
