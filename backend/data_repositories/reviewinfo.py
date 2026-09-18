# insert, select, delete
# - 장소 리뷰(REVIEWS) 조회/작성/삭제 (presentation_api/reviews.py에서 호출)
# - 조회는 누구나(비로그인 포함) 가능, 작성/삭제는 로그인한 본인만 — 게이팅은
#   프론트(로그인 여부에 따라 입력 폼 표시/비활성화)에서 하고, 삭제는 여기서도
#   username 일치 조건을 걸어 다른 사람 리뷰를 지울 수 없게 한다.
# - 리뷰 작성/삭제 시 해당 place_id의 평균 rating을 location.rating에 반영한다
#   (_recompute_location_rating). 이전엔 location.rating이 리뷰와 무관하게 방치돼
#   있었다(수동 입력값만 반영, 리뷰 평균과 동기화 안 됨).
import logging
import uuid

from config.dependency import get_supabase_client
from data_repositories import locationinfo, userinfo

logger = logging.getLogger(__name__)

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


def _recompute_location_rating(place_id: str) -> None:
    """place_id의 리뷰 평균을 다시 계산해 location.rating에 반영한다.

    리뷰가 하나도 없으면(마지막 리뷰 삭제) rating을 None으로 되돌린다.
    location 캐싱 실패를 삼키는 presentation_api/places.py의 upsert_places_batch
    패턴과 동일하게, 이 동기화가 실패해도 리뷰 작성/삭제 자체는 실패시키지 않는다.
    """
    try:
        client = get_supabase_client()
        result = client.table(TABLE).select("rating").eq("place_id", place_id).execute()
        ratings = [row["rating"] for row in result.data if row.get("rating") is not None]
        average = round(sum(ratings) / len(ratings), 1) if ratings else None
        locationinfo.update_location_rating(place_id, average)
    except Exception:
        logger.exception("리뷰 평균 rating을 location에 반영하는데 실패했습니다 (place_id=%s)", place_id)


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
    _recompute_location_rating(place_id)
    return result.data[0]


def delete_review(place_id: str, review_id: str, username: str) -> bool:
    """본인 리뷰만 삭제 가능 — username까지 조건에 걸어 다른 사람 리뷰 삭제를 막는다."""
    client = get_supabase_client()
    result = client.table(TABLE).delete().eq("id", review_id).eq("username", username).execute()
    deleted = bool(result.data)
    if deleted:
        _recompute_location_rating(place_id)
    return deleted


def update_review(place_id: str, review_id: str, username: str, rating: int, content: str) -> dict | None:
    """본인 리뷰만 수정 가능 — delete_review와 동일하게 username까지 조건에 건다.

    수정할 리뷰가 없으면(다른 사람 리뷰이거나 존재하지 않음) None을 반환한다.
    """
    client = get_supabase_client()
    result = (
        client.table(TABLE)
        .update({"rating": rating, "content": content})
        .eq("id", review_id)
        .eq("username", username)
        .execute()
    )
    if not result.data:
        return None
    updated = result.data[0]
    _recompute_location_rating(place_id)
    updated["display_name"] = userinfo.get_display_names([username]).get(username)
    return updated
