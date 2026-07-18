# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - 도착 장소의 docent 음성정보(사용자 국적 확인 포함) 조회 요청 -> data_repositories/docentinfo.py 호출
from fastapi import APIRouter

from data_repositories import docentinfo

router = APIRouter(prefix="/docent", tags=["docent"])


@router.get("/{name}")
def get_docent(name: str, language: str = "korean"):
    docent = docentinfo.get_docent(name)
    if docent is None:
        return None
    return {"name": docent["name"], "language": language, "file_path": docent.get(language)}
