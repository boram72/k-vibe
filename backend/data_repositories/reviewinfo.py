# insert, select, delete
# - 장소 리뷰(REVIEWS) 조회/작성/삭제 (presentation_api/reviews.py에서 호출)
# - 조회는 누구나(비로그인 포함) 가능, 작성/삭제는 로그인한 본인만 — 게이팅은
#   프론트(로그인 여부에 따라 입력 폼 표시/비활성화)에서 하고, 삭제는 여기서도
#   username 일치 조건을 걸어 다른 사람 리뷰를 지울 수 없게 한다.
import uuid

from config.dependency import get_supabase_client
from data_repositories import userinfo

TABLE = "reviews"


def get_reviews(place_id: str) -> list[dict]:
    """리뷰 목록을 조회하고, 각 리뷰 작성자의 display_name을 붙여서 반환한다.

    reviews.username은 화면에 노출하기엔 부적절한 내부 식별자라(예: OAuth 유저는
    "google_1029384756" 형태), 프론트가 이름 대신 표시할 display_name을 함께
    내려준다(BACKEND_REQUESTS.md 후속 요청). display_name이 없는 유저는 None —
    프론트가 username으로 폴백해서 표시한다.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .select("*")
        .eq("place_id", place_id)
        .order("created_at", desc=True)
        .execute()
    )
    reviews = result.data
    usernames = list({review["username"] for review in reviews})
    display_names = userinfo.get_display_names(usernames)
    for review in reviews:
        review["display_name"] = display_names.get(review["username"])
    return reviews


def create_review(place_id: str, username: str, rating: int, content: str) -> dict:
    client = get_supabase_client()
    row = {
        "id": str(uuid.uuid4()),
        "place_id": place_id,
        "username": username,
        "rating": rating,
        "content": content,
    }
    result = client.table(TABLE).insert(row).execute()
    return result.data[0]


def delete_review(review_id: str, username: str) -> bool:
    """본인 리뷰만 삭제 가능 — username까지 조건에 걸어 다른 사람 리뷰 삭제를 막는다."""
    client = get_supabase_client()
    result = client.table(TABLE).delete().eq("id", review_id).eq("username", username).execute()
    return bool(result.data)
