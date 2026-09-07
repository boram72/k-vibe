# presentation_api 창구 역할: 요청을 받아 적절한 repository에 위임하고 응답만 반환한다.
# - 장소 리뷰 조회/작성/삭제 요청 -> data_repositories/reviewinfo.py 호출
# - 조회(GET)는 인증 없이 누구나 호출 가능(지도 상세 팝업 "리뷰" 탭은 비로그인도 볼 수 있음).
# - 작성(POST)/삭제(DELETE)는 username을 body/query로 받아 그대로 신뢰한다 — 이 프로젝트의
#   다른 사용자별 엔드포인트(saved-places 등)와 동일하게 별도 세션/토큰 검증이 없는 구조라,
#   "로그인한 사용자만 작성 가능"은 프론트(로그인 안 했으면 입력창 비활성화)에서 게이팅한다.
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from data_repositories import reviewinfo

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreateRequest(BaseModel):
    username: str
    rating: int = Field(ge=1, le=5)
    content: str


@router.get("/{place_id}")
def list_reviews(place_id: str):
    return reviewinfo.get_reviews(place_id)


@router.post("/{place_id}")
def create_review(place_id: str, body: ReviewCreateRequest):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="리뷰 내용을 입력해주세요.")
    return reviewinfo.create_review(place_id, body.username, body.rating, content)


@router.delete("/{place_id}/{review_id}")
def delete_review(place_id: str, review_id: str, username: str):
    deleted = reviewinfo.delete_review(review_id, username)
    if not deleted:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다.")
    return {"deleted": True}
