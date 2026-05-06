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
        logger.exception("Gemini configuration error")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except GeminiServiceError as exc:
        logger.exception("Gemini service error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI response generation failed.",
        ) from exc

    return ChatResponse(response=response)
