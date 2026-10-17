# Backend

The Stadtlöwe backend: a small, dependency-free PHP API that receives business
requests (contact + project), stores them as JSON, and drives a **local AI
layer** (llama.cpp + a GGUF model) for a public form-assist helper and an
authenticated admin chat that can read the stored requests.

For the React app see [frontend.md](./frontend.md); for setup see the root
[README.md](./README.md).

---

## Tech stack

| Area | Choice |
|------|--------|
| Language | PHP 8 (strict types, no framework, no Composer) |
| Server (dev) | PHP built-in server (`php -S`) via `serve.bat` |
| Storage | Flat JSON files under `api/` with `flock` on write |
| Auth | PHP session cookie + credentials from `.env` |
| AI | Local `llama.cpp` `llama-server`, OpenAI-compatible HTTP |
| Model | Qwen3.5-4B GGUF (Q4), GPU-offloaded on NVIDIA |

No external PHP dependencies — every endpoint requires only `src/*.php`.

---

## Running

```bash
cd backend
serve.bat          # php -S localhost:8000  -> serves /api/...
run-model.bat      # downloads (first run) + starts llama-server on 127.0.0.1:8080
```

Requirements: PHP 8+, Windows for the `.bat`/`.ps1` scripts (the `php -S` and
`llama-server` commands work on other platforms). The model and runtime live in
`ml/` and `tools/` and are gitignored; `setup-model.ps1` fetches them.

---

## Structure

```
backend/
  api/                     HTTP endpoints (served under /api/...)
    contact.php            POST receive a contact request       -> messages.json
    project/submit.php     POST receive a "Projekt starten" req -> projects.json
    assist.php             POST public AI form-assist (no data access)
    health.php             GET  health/readiness probe
    admin/
      login.php            POST sign in
      logout.php           POST sign out
      me.php               GET  current session
      stats.php            GET  dashboard counts
      records.php          GET  stored records (?type=contact|project)
      chat.php             POST admin AI chat (tool loop)
    messages.json          live contact store  (gitignored)
    projects.json          live project store  (gitignored)
    sample_*.json          seed data
    .htaccess              denies direct access to the JSON stores

  src/                     shared code (no framework)
    env.php                minimal .env loader + env()
    http.php               respond_json(), read_request_body(), as_array()
    auth.php               session, admin_credentials(), require_admin()
    storage.php            append_json_record() with exclusive lock
    stats.php              load_records(), count_records()
    llm.php                llm_config(), llm_request(), llm_chat()
    prompts.php            prompt-module loading + composition
    tools.php              admin tool registry + execution
    untrusted.php          untrusted_block() delimiter wrapper
    rate_limit.php         client_ip() + sliding-window limiter

  prompts/                 system-prompt modules (*.md)
    persona.md  domain.md  admin.md  assist.md  assist_goals.md

  ml/                      GGUF model files (gitignored)
  tools/llama.cpp/         bundled llama.cpp runtime (gitignored)

  setup-model.ps1          download llama.cpp (CUDA by default, -Cpu to force)
  run-model.bat            start llama-server with GPU offload
  serve.bat                start the PHP dev server
  reset-data.ps1/.bat      reseed the JSON stores from samples
```

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/contact.php` | – | Store a contact request (email, phone, title, message) |
| POST | `/api/project/submit.php` | – | Validate + store a structured project request |
| POST | `/api/assist.php` | – | Public AI suggestions for the project-form draft |
| GET/HEAD | `/api/health.php` | – | Health probe (storage writability, PHP version) |
| POST | `/api/admin/login.php` | – | Sign in (session cookie) |
| POST | `/api/admin/logout.php` | cookie | Sign out |
| GET | `/api/admin/me.php` | cookie | Current admin |
| GET | `/api/admin/stats.php` | cookie | today/week + open-project counts |
| GET | `/api/admin/records.php?type=contact\|project` | cookie | All records, newest first |
| POST | `/api/admin/chat.php` | cookie | Chat with the model (reads records via tools) |

All responses are JSON with an `ok` boolean; errors use 4xx/5xx plus a German
`error` message.

---

## Functions

### Storage & validation

- `append_json_record()` (`src/storage.php`) appends to a JSON array under an
  **exclusive `flock`** so concurrent writes can't corrupt the file. Reads go
  through `load_records()`.
- `contact.php` / `project/submit.php` validate input server-side (email format,
  phone pattern, length caps, enum checks for `service`/`engagement`/timeline),
  return `422` with per-field `errors`, and store a record with an `id`, `status`
  (`new`) and `createdAt`.
- `health.php` reports `healthy`/`degraded` based on store writability.

### Auth (`src/auth.php`)

- Dedicated session cookie (`stadtloewe_admin`); `login.php` uses
  `hash_equals()` for the password and `session_regenerate_id(true)` on success.
- Credentials come only from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) and
  **fail closed** when unset.
- `require_admin()` guards every admin endpoint, responding `401` otherwise.

### AI layer (`src/llm.php`)

- Talks to `llama-server` over its OpenAI-compatible `/v1/chat/completions`.
- `llm_request()` returns the raw assistant message incl. `tool_calls`;
  `llm_chat()` is a string convenience wrapper. Thinking is disabled
  (`enable_thinking: false`) for clean answers, and JSON mode and tool schemas
  are opt-in per call.

### Prompts (`src/prompts.php`)

- System prompts are composed from `prompts/*.md` modules joined with a rule.
- Per-surface lists come from env: `AI_ADMIN_PROMPTS` (default
  `persona,domain,admin`) and `AI_ASSIST_PROMPTS` (default
  `assist,assist_goals`); `AI_PROMPTS` is the generic fallback.

### Public form assist (`api/assist.php`)

- Unauthenticated but **zero data access**: accepts only a whitelisted,
  length-capped draft (contact details are not even accepted).
- Wraps the draft in `<untrusted_data>` and asks the model for structured JSON
  (`summary`, `suggestions[]`).
- `missing[]` is computed deterministically in PHP from the draft, not by the
  model. Rate-limited per client IP (`ASSIST_RATE_LIMIT` / `ASSIST_RATE_WINDOW`).

### Admin chat with tools (`api/admin/chat.php`)

- Strips any client-supplied `system` role and always prepends the
  server-composed system prompt (plus the current date for "today"/"this week").
- Runs a bounded **tool loop** (max 4 iterations, then forces a final answer):
  the model may call `read_contact_messages` / `read_project_requests`.
- Tool results are wrapped in `<untrusted_data>` and the prompts instruct the
  model to treat them as data only — the defense against prompt injection from
  customer-submitted text.

### Read-only tools (`src/tools.php`)

- `admin_tools()` publishes the OpenAI tool schemas; `admin_tool_names()` is the
  hard whitelist. `execute_admin_tool()` rejects unknown names and **validates
  every argument**; filtering, sorting and limiting happen in PHP
  (`read_admin_records`) — the model never touches a file path.

### Rate limiting (`src/rate_limit.php`)

- Sliding-window limiter shared via a locked JSON file in the temp dir, keyed by
  `REMOTE_ADDR` (spoofable headers ignored). Fails open so a broken temp dir
  can't take the service down.

### Seed data

- `reset-data.ps1` copies `sample_*.json` over the live stores and shifts
  `createdAt` values so the newest record is "now", keeping dashboard counts
  meaningful.

---

## Configuration (`backend/.env`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin credentials (fail closed if unset) | – |
| `AI_BASE_URL` | llama-server base URL | `http://127.0.0.1:8080` |
| `AI_MODEL` | Model name sent to the API | `local` |
| `AI_TIMEOUT` | Request timeout (s) | `60` |
| `AI_PROMPTS` | Generic prompt modules | `persona,domain` |
| `AI_ADMIN_PROMPTS` | Admin chat modules | `persona,domain,admin` |
| `AI_ASSIST_PROMPTS` | Form-assist modules | `assist,assist_goals` |
| `ASSIST_RATE_LIMIT` / `ASSIST_RATE_WINDOW` | Assist requests per IP / window (s) | `20` / `60` |

Model runtime (read by `run-model.bat`): `AI_MODEL_PATH`, `AI_PORT`, `AI_CTX`,
`AI_NGL`, `AI_THREADS`. `run-model.bat` starts llama-server with GPU offload
(`-ngl 99 -fa on -ctk q8_0 -ctv q8_0 --jinja --no-webui`); `--jinja` is required
for tool calling.

---

## Security posture

In place:

- Admin endpoints behind a session; password compared with `hash_equals`;
  session id regenerated on login.
- Client `system` messages discarded; the server always owns the system prompt.
- Tool use is whitelisted and read-only, with server-side filtering and
  `<untrusted_data>` isolation of customer text.
- Rate limiting on the public assist endpoint; `.htaccess` denies direct access
  to the JSON stores; the model listens on `127.0.0.1` only.

Known gaps (see below): flat-file storage without read locking, single hardcoded
admin with a plaintext secret, no CSRF token, no login throttling, no structured
logging, and no automated tests yet.

---

## Remaining future improvements

**Data layer**
- Replace flat JSON with a real store (SQLite/MySQL): transactional writes,
  shared-lock reads, indexes, and queries instead of loading whole files.
- Move the data outside the web root so protection doesn't depend on
  `.htaccess`.
- Add a `status` workflow (new → in progress → done) with endpoints + audit
  trail so "Offene Projekte" reflects reality.

**Security**
- Store a **hashed** admin secret (or multiple users/roles) instead of a
  plaintext password in `.env`.
- Add CSRF protection to state-changing endpoints and login throttling /
  lockout after repeated failures.
- Security headers, HTTPS/reverse-proxy guidance, and CORS policy for
  production.

**AI layer**
- Validate model output against a schema and add prompt/regression **evals**;
  the 4B model is occasionally unreliable.
- Optional **split models**: a small fast model for `assist`, the 4B for admin,
  on separate ports.
- Streaming (SSE passthrough from llama-server) for the admin chat.
- Async job/queue for model calls, with retries, timeouts and a circuit breaker.

**Observability & ops**
- Structured request logging, request IDs, and error monitoring/metrics.
- Containerize (PHP-FPM + reverse proxy) and document a deployment topology.

**Testing**
- PHPUnit tests for `src/*` (validation, tools, prompts, rate limit) and
  integration tests for the endpoints (happy path, `401`, `422`, tool loop,
  rate limit).

**Privacy / GDPR**
- Define retention and deletion for stored PII, support data-subject requests,
  and confirm consent handling matches the stored `consent` flag.

**API hygiene**
- Version the API, centralize request/response schemas, and share types with the
  frontend.
