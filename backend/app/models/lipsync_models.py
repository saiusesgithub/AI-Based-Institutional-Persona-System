from pydantic import BaseModel, ConfigDict, Field


class LipSyncRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    audio_base64: str = Field(..., min_length=1)
    audio_format: str = Field(default="wav", pattern="^wav$")


class PhonemeCue(BaseModel):
    start: float
    end: float
    value: str


class LipSyncResponse(BaseModel):
    phonemes: list[PhonemeCue]
