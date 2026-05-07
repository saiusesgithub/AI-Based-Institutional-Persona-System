import base64
import json
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


class RhubarbConfigurationError(RuntimeError):
    pass


class RhubarbServiceError(RuntimeError):
    pass


class RhubarbService:
    def __init__(self, executable_path: str | None = None) -> None:
        self.executable_path = self._normalize_executable_path(
            executable_path or os.getenv("RHUBARB_PATH", "rhubarb")
        )

    async def extract_phonemes(self, audio_base64: str) -> list[dict[str, float | str]]:
        audio_bytes = base64.b64decode(audio_base64)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = Path(tmpdir) / "speech.wav"
            output_path = Path(tmpdir) / "speech.json"
            input_path.write_bytes(audio_bytes)

            command = [
                self.executable_path,
                "-f",
                "json",
                "-o",
                str(output_path),
                str(input_path),
            ]

            logger.info("Running Rhubarb Lip Sync executable=%r", self.executable_path)

            try:
                result = subprocess.run(
                    command,
                    capture_output=True,
                    check=False,
                    text=True,
                    timeout=45,
                )
            except FileNotFoundError as exc:
                raise RhubarbConfigurationError(
                    f"Rhubarb executable was not found at {self.executable_path!r}. "
                    "Set RHUBARB_PATH in backend/.env."
                ) from exc
            except subprocess.TimeoutExpired as exc:
                raise RhubarbServiceError("Rhubarb timed out while processing audio.") from exc

            if result.returncode != 0:
                logger.error("Rhubarb error: %s", result.stderr)
                raise RhubarbServiceError("Rhubarb failed to extract phoneme timings.")

            payload = json.loads(output_path.read_text(encoding="utf-8"))
            cues = payload.get("mouthCues", [])

            return [
                {
                    "start": float(cue["start"]),
                    "end": float(cue["end"]),
                    "value": str(cue["value"]),
                }
                for cue in cues
            ]

    def _normalize_executable_path(self, executable_path: str) -> str:
        normalized = executable_path.strip().strip('"').strip("'")

        # python-dotenv treats backslash escapes inside double quoted values. A Windows
        # path ending in \rhubarb.exe can become a carriage return plus "hubarb.exe".
        normalized = (
            normalized
            .replace("\r", "\\r")
            .replace("\n", "\\n")
            .replace("\t", "\\t")
        )

        if normalized == "rhubarb":
            return shutil.which("rhubarb") or normalized

        path = Path(normalized).expanduser()

        if path.is_dir():
            executable_name = "rhubarb.exe" if os.name == "nt" else "rhubarb"
            path = path / executable_name

        return str(path)
