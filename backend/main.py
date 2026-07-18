from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from presentation_api import playDocentVoice, route, showPersona, user

app = FastAPI(title="K-Vibe Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(route.router)
app.include_router(showPersona.router)
app.include_router(playDocentVoice.router)
app.include_router(user.router)


@app.get("/health")
def health():
    return {"status": "ok"}
