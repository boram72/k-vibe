import httpx

from config.configure import GROQ_API_KEY

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# Groq는 구모델 버전을 주기적으로 폐기함(llama-3.3-70b-versatile은 model_not_found).
# GET /openai/v1/models 목록에 있는 현재 모델로 유지할 것.
GROQ_MODEL = "qwen/qwen3.8-27b"
GROQ_TIMEOUT_SECONDS = 20


def complete(prompt: str) -> str:
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
