from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from business_services import snsAnalysisService

router = APIRouter(tags=["analyze"])


class AnalyzeRequest(BaseModel):
    youtube_url: str
    locale: str = "ko"


@router.post("/analyze")
def analyze(body: AnalyzeRequest):
    try:
        return snsAnalysisService.analyze_sns_url(body.youtube_url, body.locale)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
