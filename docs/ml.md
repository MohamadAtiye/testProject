# ML service

Internal Python service that owns model-facing behavior: prompts, llama.cpp
calls, output normalization, evals and ML metrics.

## Stack

| Area | Choice |
|------|--------|
| Runtime | Python 3.12 |
| Framework | FastAPI |
| HTTP client | httpx |
| Validation | Pydantic |
| Metrics | prometheus-client |
| Tests | pytest |
| Model runtime | llama.cpp server (separate container) |

## Responsibility

- Compose prompt profiles for `assist` and `admin`.
- Call llama.cpp with JSON mode and tool schemas.
- Repair and normalize assist JSON.
- Forward streaming responses.
- Expose ML health and Prometheus metrics.
- Run prompt regression evals.
- Never access MySQL or customer records.
- Never execute tools; the backend owns tool execution.

## Structure

```text
ml/
  app/
    main.py          FastAPI app, auth, routes, SSE, metrics
    config.py        pydantic-settings environment
    schemas.py       request/response models
    prompts.py       prompt module loading/composition
    llama.py         llama.cpp client (chat, stream, health)
    output.py        assist JSON repair and caps
    untrusted.py     <untrusted_data> wrapper
  prompts/
    persona.md       identity and tone
    domain.md        business context and data fields
    admin.md         admin tool usage and untrusted-data rules
    assist.md        form-assist behavior and JSON contract
    assist_goals.md  form-assist goals and priorities
  models/            GGUF files (gitignored, mounted into llama)
  scripts/
    eval_assist.py   prompt regression eval
  tests/
    test_output.py
    test_prompts.py
    evals/assist_cases.json
  Dockerfile
```

## API

Internal docs: `/docs`  
OpenAPI: `/openapi.json`

All `/v1/*` routes require:

```http
Authorization: Bearer <ML_API_KEY>
```

`/health` and `/metrics` are only reachable inside the internal network.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | llama.cpp readiness |
| GET | `/metrics` | Prometheus metrics |
| GET | `/v1/models` | model + prompt profile info |
| POST | `/v1/assist` | form-assist JSON |
| POST | `/v1/chat` | tool-aware chat, non-streaming |
| POST | `/v1/chat/stream` | forwarded llama.cpp SSE |

### Assist request

```json
{
  "draft": {
    "service": "design",
    "goal": "Wir brauchen eine neue Website …"
  }
}
```

Response:

```json
{
  "summary": "…",
  "suggestions": ["…"]
}
```

The backend computes `missing[]`; the ML service only returns model output. The
draft is wrapped as `<untrusted_data>`.

### Chat request

```json
{
  "profile": "admin",
  "messages": [{ "role": "user", "content": "Was ist heute eingegangen?" }],
  "tools": [],
  "context": { "date": "2026-10-21" }
}
```

Returns the assistant message, including any `tool_calls`. The backend executes
the tools and sends the results back.

### Streaming

`/v1/chat/stream` forwards llama.cpp's `text/event-stream` response. The Node
backend parses it and forwards `tool`/`token`/`done`/`error` events to the
browser.

## Prompts

Prompts are files, not code. Active modules come from env:

| Surface | Env var | Default |
|---------|---------|---------|
| Admin chat | `ADMIN_PROMPTS` | `persona,domain,admin` |
| Form assist | `ASSIST_PROMPTS` | `assist,assist_goals` |

To add a profile:

1. Add `prompts/<profile>.md`.
2. Add its name to the matching env list.
3. Add a schema/profile branch if it needs a different request shape.

## Model files

Model files are not in git. Put a `.gguf` in `models/` and set `AI_MODEL_FILE`
in the root `.env`. The `llama` container mounts `./ml/models:/models:ro`.

This service does not load the model in-process. It calls `llama` over
`LLAMA_BASE_URL`.

## Configuration

Use `ml/.env.example` for host development. Docker passes values from
`docker-compose.yml`.

| Variable | Purpose | Default |
|----------|---------|---------|
| `LLAMA_BASE_URL` | llama.cpp URL | `http://127.0.0.1:8080` |
| `LLAMA_TIMEOUT` | request timeout (s) | `120` |
| `ML_API_KEY` | shared service key | `dev-ml-key` |
| `MODEL_NAME` | model name sent to llama | `local` |
| `ADMIN_PROMPTS` | admin prompt modules | `persona,domain,admin` |
| `ASSIST_PROMPTS` | assist prompt modules | `assist,assist_goals` |
| `LOG_LEVEL` | Python log level | `info` |

## Commands

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

pytest
docker compose exec ml python scripts/eval_assist.py
```

The eval uses the same prompt modules and output parser as the live endpoint.
It fails on broken JSON shape, length violations or invented URLs.

## Security

- Internal-only Docker network; no published port.
- Shared Bearer key for backend → ML calls.
- No database credentials or database client.
- Drafts and tool results are treated as `<untrusted_data>`.
- The service proposes tool calls but never executes them.
- Output is normalized and length-capped.
- Logs and metrics carry request IDs.

## Known trade-offs

- Tool-call streaming is handled by the backend; small local models are
  unreliable when streaming tool-call JSON.
- The eval is a smoke/regression check, not a statistical evaluation suite.
- One model per container; multi-model routing is a future step.
