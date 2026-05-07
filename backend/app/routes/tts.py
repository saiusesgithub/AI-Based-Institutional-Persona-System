import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models.tts_models import TTSRequest, TTSResponse
from app.services.elevenlabs_service import (
    ElevenLabsConfigurationError,
    ElevenLabsServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])


@router.post("", response_model=TTSResponse)
async def tts(payload: TTSRequest, request: Request) -> TTSResponse:
    elevenlabs_service = request.app.state.elevenlabs_service

    try:
        audio = await elevenlabs_service.synthesize_speech(
            text=payload.text,
            persona_key=payload.persona,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown persona: {payload.persona}",
        ) from exc
    except ElevenLabsConfigurationError as exc:
        logger.error("ElevenLabs configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ElevenLabsServiceError as exc:
        logger.error("ElevenLabs service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return TTSResponse(**audio)
