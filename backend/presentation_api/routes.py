from fastapi import APIRouter
from pydantic import BaseModel

from business_services import personaRouteService

router = APIRouter(prefix="/routes", tags=["routes"])


class GenerateRouteRequest(BaseModel):
    theme: str
    detail: str
    start_time: str = "10:00"
    locale: str = "ko"


@router.post("/generate")
def generate_route(body: GenerateRouteRequest):
    return personaRouteService.generate_route(
        theme=body.theme,
        detail=body.detail,
        start_time=body.start_time,
        locale=body.locale,
    )
