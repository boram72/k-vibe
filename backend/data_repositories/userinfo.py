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
