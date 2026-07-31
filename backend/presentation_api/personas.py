from fastapi import APIRouter

from business_services import personaRouteService

router = APIRouter(prefix="/personas", tags=["personas"])


@router.get("")
def get_personas(locale: str = "ko"):
    return personaRouteService.list_personas(locale)
