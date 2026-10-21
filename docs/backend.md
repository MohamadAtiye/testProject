# Backend

Node.js API that owns MySQL data, authentication, validation, admin tools and
AI orchestration.

## Stack

| Area | Choice |
|------|--------|
| Runtime | Node.js 22 |
| Framework | Fastify 5 |
| Language | TypeScript (strict) |
| Validation | Zod + `fastify-type-provider-zod` |
| API docs | OpenAPI 3.1 + Swagger UI |
| Database | MySQL 8.4 via `mysql2` |
| Auth | JWT, HttpOnly cookie or Bearer |
| Passwords | bcryptjs |
| Tests | Vitest |
| Logging | Pino JSON + request IDs |
| Serving | internal Docker container, no published port |

## Responsibility

- Receive and validate contact and project requests.
- Store and query contacts, projects and admin users.
- Issue and verify JWTs.
- Rate-limit public and login endpoints.
- Expose dashboard statistics and records.
- Run the bounded AI tool loop.
- Execute read-only admin tools against MySQL.
- Call the Python ML service and never expose it publicly.
- Publish OpenAPI contracts and generate frontend types.

## Structure

```text
backend/
  src/
    app.ts                 Fastify app, plugins, OpenAPI, error handling
    server.ts              process entrypoint
    config.ts              environment validation
    routes/
      public.ts            health, metrics, contact, projects, assist
      admin.ts             login/logout/me/stats/records/chat/SSE
    schemas/
      common.ts            shared health/phone schemas
      records.ts           contact/project/draft/stats contracts
      admin.ts             login/chat contracts
    db/
      pool.ts              mysql2 pool + health + close
      records.ts           create/list/count queries
      admins.ts            admin lookup/upsert
      chat.ts              chat conversations + messages
    ml/
      client.ts            typed ML service client
      types.ts             ML message/tool contracts
    tools.ts               read-only tools + untrusted wrapper
    services/chat.ts       tool loop + SSE orchestration
    lib/
      auth.ts              JWT sign/verify
      security.ts          Origin/Referer checks
      errors.ts            HttpError
      time.ts              UTC helpers
      untrusted.ts         <untrusted_data> wrapper
    scripts/               migrate, seed, ensure-admin, export-openapi
  migrations/              SQL migrations
  seeds/                   demo seed SQL
  tests/                   Vitest tests
  Dockerfile
  entrypoint.sh
```

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/contact` | – | Contact request |
| POST | `/api/v1/projects` | – | Project request |
| POST | `/api/v1/assist` | – | AI form suggestions |
| GET | `/api/v1/health` | – | DB + ML health |
| GET | `/api/v1/metrics` | token | Prometheus-style counts |
| POST | `/api/v1/admin/login` | – | Login, cookie + JWT |
| POST | `/api/v1/admin/logout` | cookie/origin | Logout |
| GET | `/api/v1/admin/me` | cookie/Bearer | Current admin |
| GET | `/api/v1/admin/stats` | cookie/Bearer | Dashboard counts |
| GET | `/api/v1/admin/records` | cookie/Bearer | Contacts/projects |
| GET | `/api/v1/admin/chat/conversations` | cookie/Bearer | List chats |
| POST | `/api/v1/admin/chat/conversations` | cookie/origin | Start a chat |
| GET | `/api/v1/admin/chat/conversations/:id/messages` | cookie/Bearer | Load one chat |
| DELETE | `/api/v1/admin/chat/conversations/:id` | cookie/origin | Delete a chat |
| POST | `/api/v1/admin/chat` | cookie/Bearer | Non-streaming AI chat |
| POST | `/api/v1/admin/chat/stream` | cookie/Bearer | SSE AI chat |

Swagger UI: `/api/docs`  
OpenAPI JSON: `/api/openapi.json`

## Authentication

1. `POST /api/v1/admin/login` validates the body, compares the password with the
   bcrypt hash and signs a JWT with `sub`, `email`, `role`, `iss`, `aud`, `exp`.
2. The response sets `admin_token` as `HttpOnly`, `SameSite=Lax`, optional
   `Secure`, and returns the token for mobile clients.
3. Admin routes accept a Bearer token or the cookie.
4. `verifyAdmin()` checks signature, expiry, issuer, audience and role.
5. Cookie-based writes require a trusted `Origin`/`Referer`.
6. A dummy bcrypt hash is compared for unknown emails to reduce timing leaks.

The local login is a bridge to a future OIDC provider. The Bearer validation
path can stay the same when that migration happens.

## Validation and OpenAPI

Zod schemas are the source of truth:

- `ProjectSubmitSchema` — strict submission.
- `ProjectDraftSchema` — lenient assist draft; unknown fields such as contact
  data are stripped.
- `ContactMessageSchema`, `ContactRecordSchema`.
- `RecordsQuerySchema`, `StatsResponseSchema`, `ChatRequestSchema`
  (`conversationId` + up to 20 messages), `LoginSchema`.

Validation failures return `422` with field paths:

```json
{
  "ok": false,
  "error": "Bitte prüfe deine Eingaben.",
  "errors": { "service": "Invalid option: …" }
}
```

Contract workflow:

```bash
# from repository root
npm run api:sync
```

This writes `backend/openapi.json` and regenerates
`frontend/src/api/schema.d.ts`.

## Database

Migrations run at container startup:

- `admins` — email + bcrypt hash.
- `contacts` — email, phone, title, message, IP, UTC timestamp.
- `projects` — service, engagement, goal, timeline, budget, contact, consent,
  status, IP, UTC timestamp.
- `chat_conversations` — id, admin email, title, timestamps.
- `chat_messages` — role, content, UTC timestamp, cascade on conversation delete.
- `schema_migrations` — applied migrations.

`seeds/demo.sql` is inserted only when `SEED_DEMO=1` and the contact/project
tables are empty. It uses relative `UTC_TIMESTAMP()` offsets so the dashboard
has meaningful today/week counts.

## AI integration

`src/ml/client.ts` calls the Python service:

- `POST /v1/assist`
- `POST /v1/chat`
- `POST /v1/chat/stream`
- `GET /health`

All `/v1/*` calls use `Authorization: Bearer $ML_API_KEY`.

The backend owns:

- user authorization
- SQL queries and filtering
- tool validation and execution
- the bounded tool loop
- `<untrusted_data>` wrapping

The ML service owns prompts, llama.cpp calls, output repair and model evals.

### Chat flow

Non-streaming:

```text
messages -> ML /v1/chat (tools)
  -> tool calls? execute read-only tools, append results, repeat (max 4)
  -> final reply
```

Streaming:

1. Resolve tools with non-streaming `/v1/chat` calls.
2. Stream the final answer from `/v1/chat/stream` without tools.
3. Emit `tool`, `token`, `done`, `error` SSE events.

This avoids unreliable streaming tool-call JSON from small local models while
still streaming the final answer token by token.

### Chat conversations

Each admin can have multiple conversations. `GET /chat/conversations` returns
the list with title, timestamps and message count, newest first.
`POST /chat/conversations` creates an empty chat. `GET
/chat/conversations/:id/messages` loads one owned conversation and up to 200
messages. `DELETE /chat/conversations/:id` removes it and cascades to messages.

Both `/chat` and `/chat/stream` require a `conversationId` and persist the last
user message and final assistant reply into that conversation. Chat requests
accept at most 20 messages; the frontend keeps the display history but sends
only the most recent 20 to the model. Ownership is checked by `admin_email`;
one admin cannot read or delete another admin's chat.

## Configuration

Use `backend/.env.example` for host development. Docker passes values from
`docker-compose.yml`.

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP port | `3000` |
| `DB_*` | MySQL connection | `stadtloewe` |
| `JWT_SECRET` | Signing key, min 32 chars | dev key |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Token validation | `stadtloewe` / `stadtloewe-api` |
| `JWT_EXPIRES_IN` | Access-token TTL | `1h` |
| `COOKIE_SECURE` | Secure cookie | `0` |
| `TRUST_PROXY` | Trust nginx proxy headers | `0` |
| `ALLOWED_ORIGINS` | Allowed browser origins | localhost |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin | demo |
| `SEED_DEMO` | Seed when empty | `1` |
| `ML_BASE_URL` / `ML_API_KEY` | ML service | localhost / dev key |
| `ML_TIMEOUT_MS` | ML timeout | `120000` |
| `*_RATE_LIMIT` / `*_RATE_WINDOW_MS` | Abuse control | per route |
| `METRICS_TOKEN` | Metrics token | – |

## Security posture

- No published host port.
- JWT issuer, audience and role are verified.
- Cookie writes require a trusted Origin/Referer.
- Passwords are bcrypt hashes; env password is bootstrap input only.
- Login, contact, project and assist are rate-limited.
- Zod validates every request and strips unknown fields.
- Assist accepts no contact data and has no data access.
- Admin tools are whitelisted, read-only and argument-validated.
- Tool results and customer text are wrapped as `<untrusted_data>`.
- ML uses a shared service key.
- Helmet and nginx set security headers.
- Request IDs flow through nginx → Node → Python → llama.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

Covered: project/draft validation, contact-data stripping, untrusted-data
escaping, unknown tool rejection.

## Known trade-offs

- JWT is locally issued; OIDC is the next step for SSO.
- Rate limiting is in-process; multiple replicas need Redis or a DB limiter.
- Tool decisions are non-streaming; the final answer is streamed.
- No refresh-token rotation yet.
- Chat history has no automatic retention policy and each conversation is
  capped at 200 returned messages; there is no search/pagination yet.
- No project status update endpoint or audit trail yet.
- No PII retention/deletion workflow yet.
