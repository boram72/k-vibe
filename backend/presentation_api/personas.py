from fastapi import APIRouter

from business_services import personaRouteService

router = APIRouter(prefix="/personas", tags=["personas"])


@router.get("")
def get_personas(locale: str = "ko"):
    return personaRouteService.list_personas(locale)


@router.get("/places")
def get_persona_places(locale: str = "ko"):
    """지도 스타별 필터용: 페르소나 경로에 등록된 장소를 좌표와 함께 반환한다."""
    return personaRouteService.get_persona_places(locale)
