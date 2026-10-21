# Stadtlöwe

Website, admin dashboard and local AI assistant. The platform runs as five
containers:

| Service | Stack | Exposure | Docs |
|---------|-------|----------|------|
| `frontend` | React + nginx | published on `:8080` | [docs/frontend.md](./docs/frontend.md) |
| `backend` | Node.js + Fastify + TypeScript | internal | [docs/backend.md](./docs/backend.md) |
| `ml` | Python + FastAPI | internal | [docs/ml.md](./docs/ml.md) |
| `llama` | llama.cpp + GGUF | internal | [docs/llama.md](./docs/llama.md) |
| `db` | MySQL 8.4 | internal | [docs/database.md](./docs/database.md) |

Only the frontend is published. The frontend cannot resolve `ml` or `llama`;
the Node backend is the only ML client.

```text
Browser
  └─ frontend (nginx :8080)
       └─ /api/* ──> backend (Fastify)
                       ├─ MySQL
                       └─ ml (FastAPI)
                            └─ llama (llama.cpp)
```

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Website: <http://localhost:8080>
- Admin: <http://localhost:8080/admin>
- API docs: <http://localhost:8080/api/docs>
- Health: <http://localhost:8080/api/v1/health>

Default admin credentials:

```text
admin@example.com / testPass123
```

Put your `.gguf` in `ml/models/` and set `AI_MODEL_FILE` in `.env`. The default
setup uses CUDA; see [docs/llama.md](./docs/llama.md) for CPU fallback and GPU
memory notes.

## API contracts and auth

The backend publishes OpenAPI at `/api/openapi.json` and Swagger UI at
`/api/docs`. The frontend uses generated types with `openapi-fetch`.

```bash
npm run api:sync      # backend spec -> frontend/src/api/schema.d.ts
```

Admin auth issues a JWT:

- Web: `HttpOnly`, `SameSite=Lax` cookie
- Mobile: `Authorization: Bearer <token>`

Admin write routes accept either cookie or Bearer. Cookie writes require a
trusted Origin/Referer.

`/api/v1/admin/chat/stream` streams SSE events (`tool`, `token`, `done`,
`error`). Tool decisions are resolved non-streaming; the final answer is
streamed. Admins can create, switch between and delete persisted chat
conversations through `/api/v1/admin/chat/conversations`.

See [docs/backend.md](./docs/backend.md) for the full endpoint table and
[docs/frontend.md](./docs/frontend.md) for the client integration.

## Repository layout

```text
backend/      Node/Fastify API, migrations, seeds, tools, tests
ml/           FastAPI service, prompts, model files, evals, tests
frontend/     React SPA + generated API types + nginx
docs/         one document per service
docker-compose.yml
```

## Development

```bash
# frontend
cd frontend && npm install && npm run dev       # :5173

# backend
cd backend && npm install && npm run dev        # :3000

# ml
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

See the service docs for configuration and required environment variables.

## Checks

```bash
# backend
cd backend && npm run typecheck && npm test && npm run build

# ml
cd ml && pytest
docker compose exec ml python scripts/eval_assist.py

# frontend
cd frontend && npm test && npm run lint && npm run build && npm run e2e
```

## Reset demo data

```bash
docker compose down -v
docker compose up -d
```

`down -v` deletes the MySQL volume. The backend recreates the schema and inserts
demo data when `SEED_DEMO=1`.

## Security summary

- Backend, ML, llama and MySQL have no published host ports.
- Admin passwords are bcrypt hashes in MySQL.
- JWT issuer/audience/role are verified.
- Cookie writes require a trusted Origin/Referer.
- Login, contact, project and assist endpoints are rate-limited.
- ML uses a shared service key and has no database access.
- Admin tools are whitelisted, read-only and argument-validated.
- Customer text and tool results are wrapped as `<untrusted_data>`.
- Security headers and request IDs are set across the stack.

## Documentation

- [Frontend](./docs/frontend.md)
- [Backend](./docs/backend.md)
- [ML service](./docs/ml.md)
- [llama runtime](./docs/llama.md)
- [Database](./docs/database.md)
