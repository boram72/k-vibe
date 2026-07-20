# presentation_api 창구 역할: 요청을 받아 적절한 repository에 위임하고 응답만 반환한다.
# - 홈피드 개인화 칩용 마지막 persona 위저드 선택값 조회/저장 -> data_repositories/personapreferenceinfo.py 호출
from fastapi import APIRouter
from pydantic import BaseModel

from data_repositories import personapreferenceinfo

router = APIRouter(prefix="/persona-preference", tags=["persona-preference"])


class PersonaPreferenceRequest(BaseModel):
    theme: str
    detail: str


@router.get("/{username}")
def get_persona_preference(username: str):
    return personapreferenceinfo.get_persona_preference(username)


@router.put("/{username}")
def save_persona_preference(username: str, body: PersonaPreferenceRequest):
    return personapreferenceinfo.upsert_persona_preference(username, body.theme, body.detail)
