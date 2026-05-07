import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.chat import router as chat_router
from app.routes.lipsync import router as lipsync_router
from app.routes.tts import router as tts_router
from app.services.gemini_service import GeminiService
from app.services.rhubarb_service import RhubarbService
from app.services.tts_service import TTSService

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    app_dir = Path(__file__).resolve().parent
    backend_dir = app_dir.parent
    load_dotenv(backend_dir / ".env")
    load_dotenv(app_dir / ".env", override=False)

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
app.state.tts_service = TTSService()
app.state.rhubarb_service = RhubarbService()
app.mount("/audio", StaticFiles(directory=app.state.tts_service.output_dir), name="audio")
app.include_router(chat_router)
app.include_router(tts_router)
app.include_router(lipsync_router)


@app.get("/")
def root():
    return {"message": "Institutional Persona API"}


@app.get("/health")
def health():
    return {"status": "ok"}
