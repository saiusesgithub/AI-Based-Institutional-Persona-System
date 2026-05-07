import os
import asyncio
import json
import logging
from pathlib import Path
from typing import Any, AsyncGenerator

import httpx

logger = logging.getLogger(__name__)


class GeminiConfigurationError(RuntimeError):
    pass


class GeminiServiceError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class GeminiService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        personas_path: Path | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.max_retries = int(os.getenv("GEMINI_MAX_RETRIES", "2"))
        self.personas_path = personas_path or Path(__file__).resolve().parents[1] / "personas.json"
        self.personas = self._load_personas()

    def _load_personas(self) -> dict[str, dict[str, str]]:
        with self.personas_path.open("r", encoding="utf-8") as persona_file:
            data = json.load(persona_file)

        return data["personas"]

    async def generate_response(self, message: str, persona_key: str) -> str:
        if not self.api_key:
            raise GeminiConfigurationError("GEMINI_API_KEY is not configured.")

        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self.model}:generateContent"
        )
        payload = self._build_payload(message, persona_key)

        logger.info("Generating Gemini response for persona=%s", persona_key)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await self._post_with_retries(client, endpoint, payload)

        return self._extract_text(response.json())

    async def stream_response(
        self,
        message: str,
        persona_key: str,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            raise GeminiConfigurationError("GEMINI_API_KEY is not configured.")

        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self.model}:streamGenerateContent?alt=sse"
        )
        payload = self._build_payload(message, persona_key)

        logger.info("Streaming Gemini response for persona=%s", persona_key)

        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream(
                    "POST",
                    endpoint,
                    headers={
                        "x-goog-api-key": self.api_key,
                        "Content-Type": "application/json",
                    },
                    json=payload,
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue

                        chunk = self._extract_stream_chunk(line.removeprefix("data:").strip())

                        if chunk:
                            yield chunk
            except httpx.HTTPStatusError as exc:
                detail = self._extract_error_detail(exc.response)
                logger.warning("Gemini stream HTTP %s: %s", exc.response.status_code, detail)
                raise GeminiServiceError(detail, exc.response.status_code) from exc
            except httpx.HTTPError as exc:
                raise GeminiServiceError("Unable to stream from Gemini API.") from exc

    async def _post_with_retries(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        payload: dict[str, Any],
    ) -> httpx.Response:
        for attempt in range(self.max_retries + 1):
            try:
                response = await client.post(
                    endpoint,
                    headers={
                        "x-goog-api-key": self.api_key,
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                detail = self._extract_error_detail(exc.response)
                status_code = exc.response.status_code
                should_retry = status_code in {429, 503} and attempt < self.max_retries

                logger.warning(
                    "Gemini HTTP %s on attempt %s/%s: %s",
                    status_code,
                    attempt + 1,
                    self.max_retries + 1,
                    detail,
                )

                if should_retry:
                    await asyncio.sleep(0.8 * (attempt + 1))
                    continue

                raise GeminiServiceError(detail, status_code) from exc
            except httpx.HTTPError as exc:
                if attempt < self.max_retries:
                    logger.warning(
                        "Gemini network error on attempt %s/%s: %s",
                        attempt + 1,
                        self.max_retries + 1,
                        exc,
                    )
                    await asyncio.sleep(0.8 * (attempt + 1))
                    continue

                raise GeminiServiceError("Unable to reach Gemini API.") from exc

        raise GeminiServiceError("Gemini request failed after retries.")

    def _build_system_prompt(self, persona: dict[str, str]) -> str:
        return (
            f"You are {persona['name']}, serving as {persona['institutional_role']}.\n"
            f"Speaking style: {persona['speaking_style']}.\n"
            f"Personality: {persona['personality']}.\n"
            f"Instructions: {persona['response_instructions']}.\n"
            "Respond as an institutional AI assistant. Keep answers professional, concise, "
            "human-like, helpful, and appropriate for a college or university environment. "
            "Do not claim to perform real administrative actions unless a backend tool exists."
        )

    def _build_payload(self, message: str, persona_key: str) -> dict[str, Any]:
        persona = self.personas[persona_key]
        system_prompt = self._build_system_prompt(persona)

        return {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": message}]
                }
            ],
            "generationConfig": {
                "temperature": 0.45,
                "topP": 0.9,
                "maxOutputTokens": 320
            }
        }

    def _extract_text(self, payload: dict[str, Any]) -> str:
        try:
            parts = payload["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("Unexpected Gemini response shape: %s", payload)
            raise GeminiServiceError("Gemini response did not include text.") from exc

        text = " ".join(part.get("text", "") for part in parts).strip()

        if not text:
            raise GeminiServiceError("Gemini returned an empty response.")

        return text

    def _extract_stream_chunk(self, data: str) -> str:
        if not data or data == "[DONE]":
            return ""

        try:
            payload = json.loads(data)
            parts = payload["candidates"][0]["content"].get("parts", [])
        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
            logger.debug("Skipping unexpected Gemini stream payload: %s", data)
            return ""

        return "".join(part.get("text", "") for part in parts if isinstance(part, dict))

    def _extract_error_detail(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return "Gemini returned an error response."

        error = payload.get("error")

        if isinstance(error, dict):
            return error.get("message") or error.get("status") or "Gemini returned an error response."

        return "Gemini returned an error response."
