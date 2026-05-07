import logging
import os
import time
import uuid
from pathlib import Path

import edge_tts

logger = logging.getLogger(__name__)


class TTSServiceError(RuntimeError):
    pass


class TTSService:
    def __init__(
        self,
        output_dir: Path | None = None,
        voice: str | None = None,
        cleanup_after_seconds: int | None = None,
    ) -> None:
        self.output_dir = output_dir or Path(__file__).resolve().parents[1] / "generated_audio"
        self.voice = voice or os.getenv("EDGE_TTS_VOICE", "en-US-AriaNeural")
        self.cleanup_after_seconds = cleanup_after_seconds or int(
            os.getenv("TTS_CLEANUP_AFTER_SECONDS", "1800")
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def synthesize_speech(self, text: str, base_url: str) -> dict[str, str | float | None]:
        self.cleanup_old_audio()

        file_id = uuid.uuid4().hex
        filename = f"{file_id}.mp3"
        output_path = self.output_dir / filename

        logger.info("Generating Edge TTS audio voice=%s file=%s", self.voice, filename)

        try:
            communicate = edge_tts.Communicate(text=text, voice=self.voice)
            await communicate.save(str(output_path))
        except Exception as exc:
            raise TTSServiceError("Edge TTS audio generation failed.") from exc

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise TTSServiceError("Edge TTS produced an empty audio file.")

        return {
            "audio_url": f"{base_url.rstrip('/')}/audio/{filename}",
            "audio_base64": None,
            "duration_seconds": None,
        }

    def cleanup_old_audio(self) -> None:
        cutoff = time.time() - self.cleanup_after_seconds

        for path in self.output_dir.glob("*.mp3"):
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink()
            except OSError:
                logger.warning("Unable to remove old generated audio file: %s", path)
