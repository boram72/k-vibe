from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from presentation_api import (
    findAmenities,
    personaPreference,
    places,
    playDocentVoice,
    relatedAttractions,
    route,
    routeDraft,
    routeProgress,
    savedPlaces,
    showPersona,
    user,
)

app = FastAPI(title="K-Vibe Tracker API")

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
app.include_router(showPersona.router)
app.include_router(playDocentVoice.router)
app.include_router(user.router)
app.include_router(findAmenities.router)
app.include_router(relatedAttractions.router)
app.include_router(places.router)
app.include_router(savedPlaces.router)
app.include_router(personaPreference.router)
app.include_router(routeDraft.router)
app.include_router(routeProgress.router)


@app.get("/health")
def health():
    return {"status": "ok"}
