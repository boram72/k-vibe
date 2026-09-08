import httpx

from config.configure import OPENAI_API_KEY

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_TIMEOUT_SECONDS = 20


def complete(prompt: str) -> str:
    if not OPENAI_API_KEY:
        return ""

    try:
        response = httpx.post(
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 1024,
            },
            timeout=OPENAI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        return content if isinstance(content, str) else ""
    except Exception:
        return ""
