from collections.abc import AsyncIterator
from typing import Any

import httpx

from .config import settings


class LlamaError(RuntimeError):
    pass


class LlamaClient:
    def __init__(self) -> None:
        self.base_url = settings.llama_base_url.rstrip("/")
        self.timeout = httpx.Timeout(settings.llama_timeout, connect=5.0)

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.is_success
        except httpx.HTTPError:
            return False

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        json_mode: bool = False,
        temperature: float = 0.5,
        max_tokens: int = 512,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": settings.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LlamaError("llama-server request failed") from exc

        data = response.json()
        message = data.get("choices", [{}])[0].get("message")

        if not isinstance(message, dict):
            raise LlamaError("unexpected llama-server response")

        content = message.get("content") or ""
        tool_calls = message.get("tool_calls") or []

        return {
            "role": "assistant",
            "content": content if isinstance(content, str) else "",
            "tool_calls": tool_calls if isinstance(tool_calls, list) else [],
        }

    async def stream_chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.4,
        max_tokens: int = 700,
    ) -> AsyncIterator[bytes]:
        payload: dict[str, Any] = {
            "model": settings.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            "chat_template_kwargs": {"enable_thinking": False},
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_raw():
                        yield chunk
        except httpx.HTTPError as exc:
            raise LlamaError("llama-server stream failed") from exc


llama = LlamaClient()
