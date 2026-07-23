# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - 도착 장소의 docent 음성정보/안내 스크립트 조회 요청 -> business_services/docentService.py 호출
from fastapi import APIRouter

from business_services import docentService

router = APIRouter(prefix="/docent", tags=["docent"])


@router.get("/{name}")
def get_docent(name: str, language: str = "korean"):
    return docentService.get_docent_guide(name, language)


@router.post("/{name}/voice")
def create_docent_voice(name: str, language: str = "korean"):
    return docentService.create_docent_voice(name, language)
