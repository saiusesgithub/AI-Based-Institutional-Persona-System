import logging
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

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


@router.post("/stream")
async def stream_chat(payload: ChatRequest, request: Request) -> StreamingResponse:
    gemini_service = request.app.state.gemini_service

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            async for chunk in gemini_service.stream_response(
                message=payload.message,
                persona_key=payload.persona,
            ):
                if await request.is_disconnected():
                    logger.info("Client disconnected from chat stream.")
                    break

                yield _sse_event("token", {"text": chunk})

            yield _sse_event("done", {})
        except KeyError:
            yield _sse_event("error", {"message": f"Unknown persona: {payload.persona}"})
        except GeminiConfigurationError as exc:
            logger.error("Gemini stream configuration error: %s", exc)
            yield _sse_event("error", {"message": str(exc)})
        except GeminiServiceError as exc:
            logger.error("Gemini stream service error: %s", exc)
            yield _sse_event("error", {"message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_event(event: str, data: dict[str, str]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
