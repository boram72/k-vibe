import logging

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from presentation_api import (
    analyze,
    findAmenities,
    personas,
    personaPreference,
    places,
    playDocentVoice,
    relatedAttractions,
    route,
    routeDraft,
    routeProgress,
    routes,
    reviews,
    savedPlaces,
    showPersona,
    trending,
    user,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="K-Vibe Tracker API")


@app.exception_handler(httpx.HTTPError)
async def external_api_error_handler(request: Request, exc: httpx.HTTPError):
    # TourAPI/카카오 같은 외부 API가 타임아웃/장애나면 라우트마다 따로 처리하지 않아도
    # 여기서 한 번에 잡아 500 스택트레이스 대신 깔끔한 503으로 응답한다. (find_nearby_places가
    # 타임아웃을 못 잡아 500으로 죽던 문제 재발 방지 — 앞으로 추가되는 외부 API 호출도 자동 적용)
    logger.warning("외부 API 호출 실패 (%s): %s", request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "외부 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://192.168.219.113:5173",
        "https://unlegalised-theresia-answeringly.ngrok-free.dev",
        "https://k-vibe-psi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(route.router)
app.include_router(routes.router)
app.include_router(personas.router)
app.include_router(showPersona.router)
app.include_router(playDocentVoice.router)
app.include_router(analyze.router)
app.include_router(user.router)
app.include_router(findAmenities.router)
app.include_router(relatedAttractions.router)
app.include_router(places.router)
app.include_router(savedPlaces.router)
app.include_router(personaPreference.router)
app.include_router(routeDraft.router)
app.include_router(routeProgress.router)
app.include_router(reviews.router)
app.include_router(trending.router)


@app.get("/health")
def health():
    return {"status": "ok"}
