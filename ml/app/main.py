import json
import logging
import secrets
import time
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .config import settings
from .llama import LlamaError, llama
from .output import decode_assist_output
from .prompts import system_prompt
from .schemas import (
    AssistRequest,
    AssistResponse,
    ChatRequest,
    ChatResponse,
    HealthResponse,
)
from .untrusted import untrusted_block

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(message)s",
)
logger = logging.getLogger("stadtloewe.ml")

ASSIST_REQUESTS = Counter(
    "stadtloewe_ml_assist_requests_total",
    "Form-assist requests",
)
CHAT_REQUESTS = Counter(
    "stadtloewe_ml_chat_requests_total",
    "Chat requests by mode",
    ["mode"],
)
LLM_ERRORS = Counter(
    "stadtloewe_ml_llm_errors_total",
    "llama-server errors",
)
LLM_LATENCY = Histogram(
    "stadtloewe_ml_llm_latency_seconds",
    "llama-server latency",
    ["operation"],
)

app = FastAPI(
    title="Stadtlöwe ML API",
    description=(
        "Internal inference service. Owns prompts, model configuration and "
        "evals. It has no database access and is only reachable on the "
        "internal Docker network."
    ),
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


async def require_api_key(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.ml_api_key

    if expected == "":
        return

    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not secrets.compare_digest(authorization[7:], expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    started = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            json.dumps(
                {
                    "event": "request_failed",
                    "requestId": request_id,
                    "method": request.method,
                    "path": request.url.path,
                }
            )
        )
        raise

    response.headers["X-Request-Id"] = request_id
    logger.info(
        json.dumps(
            {
                "event": "http_response",
                "requestId": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "durationMs": round((time.perf_counter() - started) * 1000),
            }
        )
    )
    return response


@app.exception_handler(LlamaError)
async def llama_error_handler(_request: Request, exc: LlamaError):
    LLM_ERRORS.inc()
    logger.error(json.dumps({"event": "llama_error", "error": str(exc)}))
    return JSONResponse(
        status_code=502,
        content={"error": "Modell derzeit nicht erreichbar."},
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> JSONResponse:
    healthy = await llama.health()
    payload = {
        "ok": healthy,
        "status": "healthy" if healthy else "degraded",
        "model": settings.model_name,
    }
    return JSONResponse(status_code=200 if healthy else 503, content=payload)


@app.get("/v1/models")
async def models(_: Annotated[None, Depends(require_api_key)]) -> dict:
    return {
        "model": settings.model_name,
        "prompts": {
            "admin": settings.admin_prompts,
            "assist": settings.assist_prompts,
        },
    }


@app.post(
    "/v1/assist",
    response_model=AssistResponse,
    dependencies=[Depends(require_api_key)],
)
async def assist(request: AssistRequest) -> AssistResponse:
    ASSIST_REQUESTS.inc()

    messages = [
        {"role": "system", "content": system_prompt("assist")},
        {
            "role": "user",
            "content": untrusted_block(
                "project_draft",
                json.dumps(request.draft, ensure_ascii=False, indent=2),
            ),
        },
    ]

    started = time.perf_counter()
    try:
        message = await llama.chat(
            messages,
            json_mode=True,
            temperature=0.3,
            max_tokens=400,
        )
    finally:
        LLM_LATENCY.labels(operation="assist").observe(time.perf_counter() - started)

    output = decode_assist_output(message["content"]) or {
        "summary": "",
        "suggestions": [],
    }

    return AssistResponse(
        summary=output["summary"],
        suggestions=output["suggestions"],
    )


def chat_messages(request: ChatRequest) -> list[dict]:
    date = datetime.now(timezone.utc).date().isoformat()
    prompt = system_prompt(request.profile, {"date": date})

    return [
        {"role": "system", "content": prompt},
        *[message.model_dump(exclude_none=True) for message in request.messages],
    ]


@app.post(
    "/v1/chat",
    response_model=ChatResponse,
    dependencies=[Depends(require_api_key)],
)
async def chat(request: ChatRequest) -> ChatResponse:
    CHAT_REQUESTS.labels(mode="sync").inc()

    started = time.perf_counter()
    try:
        message = await llama.chat(
            chat_messages(request),
            tools=request.tools,
            temperature=0.4,
            max_tokens=700,
        )
    finally:
        LLM_LATENCY.labels(operation="chat").observe(time.perf_counter() - started)

    return ChatResponse(message=message)


@app.post(
    "/v1/chat/stream",
    dependencies=[Depends(require_api_key)],
)
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    CHAT_REQUESTS.labels(mode="stream").inc()

    async def body() -> AsyncIterator[bytes]:
        try:
            async for chunk in llama.stream_chat(
                chat_messages(request),
                tools=request.tools,
                temperature=0.4,
                max_tokens=700,
            ):
                yield chunk
        except LlamaError as exc:
            LLM_ERRORS.inc()
            logger.error(json.dumps({"event": "llama_stream_error", "error": str(exc)}))
            payload = {"error": "Modell derzeit nicht erreichbar."}
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode()

    return StreamingResponse(
        body(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
