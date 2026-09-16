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
    except snsAnalysisService.AnalysisFailedError as exc:
        # 클라이언트 요청(URL) 자체는 유효했고, 우리 쪽이 아니라 업스트림 AI
        # 서비스들이 다 실패한 경우라 400이 아니라 502로 구분한다. 프론트는
        # 어차피 타임아웃(ECONNABORTED)이 아니면 뭐든 "분석 실패, 다시
        # 시도해주세요"로 보여주므로 정확한 코드 자체가 중요한 건 아니지만,
        # "우리 서버 문제"(500)나 "잘못된 요청"(400)이 아니라는 걸 로그/모니터링
        # 볼 때 구분할 수 있게 502(Bad Gateway)로 맞춘다.
        raise HTTPException(status_code=502, detail=str(exc)) from exc
