# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - 선택된 페르소나 스타의 경로정보 조회 요청 -> data_repositories/personainfo.py, routeinfo.py 호출
from fastapi import APIRouter

from data_repositories import personainfo

router = APIRouter(prefix="/persona", tags=["persona"])


@router.get("/{name}")
def get_persona(name: str):
    return personainfo.get_persona_route(name)
