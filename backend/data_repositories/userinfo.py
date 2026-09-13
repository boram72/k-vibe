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


def update_display_name(username: str, display_name: str) -> dict | None:
    """username(내부 식별자, 불변)과 별개로 화면 표시용 display_name을 갱신한다.
    대상 유저가 없으면 None(호출부에서 404 처리).
    """
    client = get_supabase_client()
    result = client.table(TABLE).update({"display_name": display_name}).eq("username", username).execute()
    return result.data[0] if result.data else None


def get_display_names(usernames: list[str]) -> dict[str, str | None]:
    """여러 username의 display_name을 한 번의 조회로 가져온다(N+1 방지).

    리뷰 목록마다 get_user를 개별 호출하면 리뷰 수만큼 Supabase 왕복이 늘어난다
    (locationinfo.get_locations_by_place_ids와 동일한 배치조회 패턴).
    """
    if not usernames:
        return {}
    client = get_supabase_client()
    result = client.table(TABLE).select("username, display_name").in_("username", usernames).execute()
    return {row["username"]: row.get("display_name") for row in (result.data or [])}
