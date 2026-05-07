from pydantic import BaseModel, ConfigDict, Field


class TTSRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text: str = Field(..., min_length=1, max_length=5000)
    persona: str = Field(default="reception-assistant", min_length=1, max_length=80)


class TTSResponse(BaseModel):
    audio_url: str
    audio_base64: str | None = None
    duration_seconds: float | None = None
