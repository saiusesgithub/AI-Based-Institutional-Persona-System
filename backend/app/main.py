import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router
from app.routes.lipsync import router as lipsync_router
from app.routes.tts import router as tts_router
from app.services.elevenlabs_service import ElevenLabsService
from app.services.gemini_service import GeminiService
from app.services.rhubarb_service import RhubarbService

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(title="Institutional Persona API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.gemini_service = GeminiService()
app.state.elevenlabs_service = ElevenLabsService()
app.state.rhubarb_service = RhubarbService()
app.include_router(chat_router)
app.include_router(tts_router)
app.include_router(lipsync_router)


@app.get("/")
def root():
    return {"message": "Institutional Persona API"}


@app.get("/health")
def health():
    return {"status": "ok"}
