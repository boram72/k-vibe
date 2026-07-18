# insert, select, update (createDocentVoice에서 tts작업이 끝나고나면 파일 경로를 db에 업데이트해야함)
from config.dependency import get_supabase_client

TABLE = "docent"

LANGUAGE_COLUMNS = {
    "korean",
    "english",
    "chinese",
    "japanese",
    "german",
    "french",
    "russian",
}


def get_docent(name: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


def upsert_docent_voice(name: str, language: str, file_path: str) -> dict | None:
    """name(PK) 기준으로 해당 언어의 음성파일 경로를 upsert한다."""
    if language not in LANGUAGE_COLUMNS:
        raise ValueError(f"지원하지 않는 언어입니다: {language}")

    client = get_supabase_client()
    payload = {"name": name, language: file_path}
    result = client.table(TABLE).upsert(payload, on_conflict="name").execute()
    return result.data[0] if result.data else None
