import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models.lipsync_models import LipSyncRequest, LipSyncResponse
from app.services.rhubarb_service import RhubarbConfigurationError, RhubarbServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lipsync", tags=["lipsync"])


@router.post("", response_model=LipSyncResponse)
async def lipsync(payload: LipSyncRequest, request: Request) -> LipSyncResponse:
    rhubarb_service = request.app.state.rhubarb_service

    try:
        phonemes = await rhubarb_service.extract_phonemes(payload.audio_base64)
    except RhubarbConfigurationError as exc:
        logger.error("Rhubarb configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except RhubarbServiceError as exc:
        logger.error("Rhubarb service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return LipSyncResponse(phonemes=phonemes)
