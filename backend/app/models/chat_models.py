from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(..., min_length=1, max_length=4000)
    persona: str = Field(default="reception-assistant", min_length=1, max_length=80)


class ChatResponse(BaseModel):
    response: str
