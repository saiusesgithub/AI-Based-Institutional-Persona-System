import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models.tts_models import TTSRequest, TTSResponse
from app.services.tts_service import TTSServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])


@router.post("", response_model=TTSResponse)
async def tts(payload: TTSRequest, request: Request) -> TTSResponse:
    tts_service = request.app.state.tts_service

    try:
        audio = await tts_service.synthesize_speech(
            text=payload.text,
            base_url=str(request.base_url),
        )
    except TTSServiceError as exc:
        logger.error("TTS service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return TTSResponse(**audio)
