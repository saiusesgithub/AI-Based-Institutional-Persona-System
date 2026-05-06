import base64
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ElevenLabsConfigurationError(RuntimeError):
    pass


class ElevenLabsServiceError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class ElevenLabsService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        default_voice_id: str | None = None,
        personas_path: Path | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.model = model or os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
        self.default_voice_id = default_voice_id or os.getenv(
            "ELEVENLABS_DEFAULT_VOICE_ID",
            "21m00Tcm4TlvDq8ikWAM",
        )
        self.block_cooldown_seconds = int(os.getenv("ELEVENLABS_BLOCK_COOLDOWN_SECONDS", "900"))
        self.blocked_until = 0.0
        self.block_reason: str | None = None
        self.personas_path = personas_path or Path(__file__).resolve().parents[1] / "personas.json"
        self.personas = self._load_personas()

    def _load_personas(self) -> dict[str, dict[str, Any]]:
        with self.personas_path.open("r", encoding="utf-8") as persona_file:
            data = json.load(persona_file)

        return data["personas"]

    async def synthesize_speech(self, text: str, persona_key: str) -> dict[str, str]:
        if not self.api_key:
            raise ElevenLabsConfigurationError("ELEVENLABS_API_KEY is not configured.")

        if time.time() < self.blocked_until:
            raise ElevenLabsServiceError(
                self.block_reason or "ElevenLabs is temporarily disabled after a provider-side block.",
                401,
            )

        persona = self.personas[persona_key]
        voice_id = persona.get("elevenlabs_voice_id") or self.default_voice_id
        endpoint = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        payload = {
            "text": text,
            "model_id": self.model,
            "voice_settings": {
                "stability": 0.48,
                "similarity_boost": 0.72,
                "style": 0.15,
                "use_speaker_boost": True,
            },
        }

        logger.info("Generating ElevenLabs speech for persona=%s voice_id=%s", persona_key, voice_id)

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    endpoint,
                    params={"output_format": "mp3_44100_128"},
                    headers={
                        "xi-api-key": self.api_key,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = self._extract_error_detail(exc.response)
            logger.error("ElevenLabs HTTP error: %s", exc.response.text)

            if exc.response.status_code == 401 and "Free Tier usage disabled" in detail:
                self.blocked_until = time.time() + self.block_cooldown_seconds
                self.block_reason = detail
                logger.warning(
                    "ElevenLabs calls disabled for %s seconds because the provider blocked this account.",
                    self.block_cooldown_seconds,
                )

            raise ElevenLabsServiceError(detail, exc.response.status_code) from exc
        except httpx.HTTPError as exc:
            raise ElevenLabsServiceError("Unable to reach ElevenLabs API.") from exc

        audio_base64 = base64.b64encode(response.content).decode("ascii")

        return {
            "audio_base64": audio_base64,
            "audio_url": f"data:audio/mpeg;base64,{audio_base64}",
        }

    def _extract_error_detail(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return "ElevenLabs returned an error response."

        detail = payload.get("detail")

        if isinstance(detail, dict):
            return detail.get("message") or detail.get("status") or "ElevenLabs returned an error response."

        if isinstance(detail, str):
            return detail

        return "ElevenLabs returned an error response."
