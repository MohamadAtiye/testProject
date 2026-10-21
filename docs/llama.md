# llama service

The llama.cpp runtime. It loads the GGUF model and exposes an
OpenAI-compatible HTTP API to the Python ML service.

## Stack

| Area | Choice |
|------|--------|
| Runtime | `ghcr.io/ggml-org/llama.cpp:server-cuda` |
| Model | Qwen 3.5 4B GGUF, Q4 |
| Acceleration | NVIDIA CUDA (`gpus: all`) |
| API | OpenAI-compatible `/v1/chat/completions` |
| Exposure | internal Docker network only |

## Responsibility

- Load exactly one GGUF model.
- Serve chat completions, including tool calls.
- Stream completions to the ML service.
- Provide `/health` for readiness.
- Use GPU memory efficiently with quantized KV cache and flash attention.

It has no business logic, no database access, no prompts and no public route.
Only `ml` calls it.

## Structure

```text
ml/models/                     model files on the host (gitignored)
docker-compose.yml             llama service definition
```

Inside the container:

```text
/models/<AI_MODEL_FILE>        read-only model mount
/app/llama-server              runtime binary
```

The Python code lives in `ml/`, not here. See [ml.md](./ml.md).

## Docker configuration

```yaml
llama:
  image: ${ML_IMAGE:-ghcr.io/ggml-org/llama.cpp:server-cuda}
  gpus: all
  command:
    - -m /models/${AI_MODEL_FILE}
    - --host 0.0.0.0
    - --port 8080
    - -c ${AI_CTX:-4096}
    - -ngl ${AI_NGL:-99}
    - -fa on
    - -ctk q8_0
    - -ctv q8_0
    - --jinja
    - --no-webui
  volumes:
    - ./ml/models:/models:ro
```

`--jinja` is required for tool calling. `-fa`, `-ctk` and `-ctv` keep KV-cache
memory low on an 8 GB GPU.

## Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `ML_IMAGE` | llama.cpp image | CUDA server image |
| `AI_MODEL_FILE` | GGUF filename inside `ml/models` | `Qwen3.5-4B-UD-Q4_K_XL.gguf` |
| `AI_CTX` | context size | `4096` |
| `AI_NGL` | GPU layers | `99` |
| `AI_THREADS` | CPU threads | `4` |

## GPU notes

- Close games and GPU-heavy browsers before demoing; a 4B model needs most of
  an 8 GB laptop GPU.
- The ML service reports `degraded` while the model is loading.
- For CPU-only Docker:
  1. Set `ML_IMAGE=ghcr.io/ggml-org/llama.cpp:server`.
  2. Set `AI_NGL=0`.
  3. Remove `gpus: all`.
  4. Remove `-fa`, `-ctk`, `-ctv` if the CPU build rejects them.
- CPU works but chat latency is much higher.

## Health and troubleshooting

- `GET /health` inside the container.
- `docker compose logs llama` shows model loading and request timings.
- If the model file name does not match `AI_MODEL_FILE`, the container exits.
- If the gateway reports a model timeout, check `docker compose logs ml` and
  `docker compose logs llama`; the ML service returns a `502` when llama is
  unavailable.

## Security

- No published host port.
- No API key because it is internal-only; only `ml` can reach it.
- The model files are mounted read-only.
- The ML service is the only service allowed to call it by network placement.

## Known trade-offs

- One model per runtime container.
- No model hot-swapping or multi-model routing.
- No streaming cancellation beyond the client disconnecting.
- GPU/CUDA support depends on the host Docker/NVIDIA setup.
