import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class GeminiConfigurationError(RuntimeError):
    pass


class GeminiServiceError(RuntimeError):
    pass


class GeminiService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        personas_path: Path | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.personas_path = personas_path or Path(__file__).resolve().parents[1] / "personas.json"
        self.personas = self._load_personas()

    def _load_personas(self) -> dict[str, dict[str, str]]:
        with self.personas_path.open("r", encoding="utf-8") as persona_file:
            data = json.load(persona_file)

        return data["personas"]

    async def generate_response(self, message: str, persona_key: str) -> str:
        if not self.api_key:
            raise GeminiConfigurationError("GEMINI_API_KEY is not configured.")

        persona = self.personas[persona_key]
        system_prompt = self._build_system_prompt(persona)
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self.model}:generateContent"
        )
        payload = {
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

        logger.info("Generating Gemini response for persona=%s", persona_key)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    endpoint,
                    headers={
                        "x-goog-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("Gemini HTTP error: %s", exc.response.text)
            raise GeminiServiceError("Gemini returned an error response.") from exc
        except httpx.HTTPError as exc:
            raise GeminiServiceError("Unable to reach Gemini API.") from exc

        return self._extract_text(response.json())

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
