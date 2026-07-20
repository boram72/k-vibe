# presentation_api 창구 역할: 요청을 받아 적절한 repository에 위임하고 응답만 반환한다.
# - 찜한 장소 조회/저장 요청 -> data_repositories/savedplacesinfo.py 호출
# - 하트 토글 즉시 목록 전체 전송(디바운스 없음, delete 후 재삽입)
from fastapi import APIRouter
from pydantic import BaseModel

from data_repositories import savedplacesinfo

router = APIRouter(prefix="/saved-places", tags=["saved-places"])


class SavedPlaceRequest(BaseModel):
    id: str
    name: str
    category: str
    address: str
    lat: float
    lng: float
    imageUrl: str | None = None
    crowdLevel: str | None = None
    tags: list[str] | None = None


class SavedPlacesRequest(BaseModel):
    places: list[SavedPlaceRequest]


@router.get("/{username}")
def get_saved_places(username: str):
    return savedplacesinfo.get_saved_places(username)


@router.put("/{username}")
def save_places(username: str, body: SavedPlacesRequest):
    places = savedplacesinfo.save_saved_places(username, [p.model_dump() for p in body.places])
    return {"places": places}
