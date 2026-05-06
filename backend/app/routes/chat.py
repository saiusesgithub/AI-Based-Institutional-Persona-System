import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models.chat_models import ChatRequest, ChatResponse
from app.services.gemini_service import GeminiConfigurationError, GeminiServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    gemini_service = request.app.state.gemini_service

    try:
        response = await gemini_service.generate_response(
            message=payload.message,
            persona_key=payload.persona,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown persona: {payload.persona}",
        ) from exc
    except GeminiConfigurationError as exc:
        logger.error("Gemini configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except GeminiServiceError as exc:
        logger.error("Gemini service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            if exc.status_code in {429, 503}
            else status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ChatResponse(response=response)
