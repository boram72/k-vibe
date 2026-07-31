from fastapi import APIRouter

router = APIRouter(prefix="/trending", tags=["trending"])


@router.get("")
def get_trending_keywords():
    return ["인생네컷", "코인노래방", "방탈출", "성수 카페", "홍대 빈티지"]
