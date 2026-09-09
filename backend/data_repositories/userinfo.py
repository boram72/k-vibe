# insert, select
from config.dependency import get_supabase_client

TABLE = "user"


def get_user(username: str) -> dict | None:
    client = get_supabase_client()
    result = client.table(TABLE).select("*").eq("username", username).execute()
    return result.data[0] if result.data else None


def create_user(username: str, nationality: str, email: str, password: str) -> dict:
    """신규 회원가입. username(PK) 중복 시 예외를 던진다."""
    client = get_supabase_client()
    try:
        result = (
            client.table(TABLE)
            .insert(
                {
                    "username": username,
                    "nationality": nationality,
                    "email": email,
                    "password": password,
                }
            )
            .execute()
        )
    except Exception as exc:
        raise ValueError(f"이미 존재하는 사용자명입니다: {username}") from exc
    return result.data[0]


def upsert_oauth_user(username: str, email: str | None) -> dict:
    """OAuth 로그인 유저를 upsert한다. password는 없음(NULL) — ID/PW 회원가입과 구분된다.
    username은 f"{provider}_{provider_user_id}" 형태라 ID/PW 유저(사용자가 직접 정한
    이름)와 겹치지 않는다(OAUTH_INTEGRATION_REQUEST.md 열린 질문 1).
    """
    client = get_supabase_client()
    result = client.table(TABLE).upsert({"username": username, "email": email}, on_conflict="username").execute()
    return result.data[0]
