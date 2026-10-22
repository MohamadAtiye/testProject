from typing import Any, Literal

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant", "tool"]
    content: str = ""
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None


class ChatRequest(BaseModel):
    profile: Literal["admin", "assist"] = "admin"
    messages: list[Message] = Field(min_length=1)
    tools: list[dict[str, Any]] | None = None


class AssistantMessage(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str = ""
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    message: AssistantMessage


class AssistRequest(BaseModel):
    draft: dict[str, Any]


class AssistResponse(BaseModel):
    summary: str
    suggestions: list[str]


class HealthResponse(BaseModel):
    ok: bool
    status: Literal["healthy", "degraded"]
    model: str
