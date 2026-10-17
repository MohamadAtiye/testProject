# Stadtlöwe

Website + internal backend for Stadtlöwe (Design · Systems · Consulting).

## Structure

```
frontend/   React app (Vite + TypeScript) → builds to static files
backend/    PHP API + local ML layer
  api/      PHP endpoints (served under /api/...)
  src/      shared PHP code
  ml/       GGUF model files (gitignored)
  tools/    bundled llama.cpp runtime (gitignored)
```

## Frontend

React single-page app. `npm run build` produces static assets that can be hosted anywhere.

```bash
cd frontend
npm install
npm run dev      # dev server -> http://localhost:5173
npm run build    # -> frontend/dist (static files)
npm run preview  # preview the production build
```

In development, requests to `/api/*` are proxied to the PHP API at `http://localhost:8000`.

## Backend

### PHP API

```bash
cd backend
serve.bat        # runs: php -S localhost:8000  -> serves /api/...
```

Endpoints are served from `backend/api/`, e.g.:

- `POST /api/contact.php`         — receive a contact request
- `POST /api/project/submit.php`  — receive a "Projekt starten" request (→ `backend/api/projects.json`)
- `POST /api/assist.php`          — public form-assist suggestions (see below)
- `GET  /api/health.php`          — health check

Admin (session-protected):

- `POST /api/admin/login.php`     — sign in (credentials from `backend/.env`)
- `POST /api/admin/logout.php`    — sign out
- `GET  /api/admin/me.php`        — current session
- `GET  /api/admin/stats.php`     — today/this-week counts: contact + project requests, plus open projects (status `new`)
- `GET  /api/admin/records.php?type=contact|project` — all records (newest first)
- `POST /api/admin/chat.php`      — chat with the local model; reads records via read-only tools

### Form assist (public)

`POST /api/assist.php` powers the suggestions shown while a visitor fills the
"Projekt starten" form (debounced on the frontend). It is unauthenticated but
has **no data access**: it only receives the visitor's own draft, wraps it as
untrusted data, and returns `{ summary, suggestions[], missing[] }`.

- **Behavior, tone and output format:** `backend/prompts/assist.md`
- **Goals / target of the feature (edit freely):** `backend/prompts/assist_goals.md`
- Both are combined via `AI_ASSIST_PROMPTS` in `backend/.env`.
- Rate-limited per client IP via `ASSIST_RATE_LIMIT` / `ASSIST_RATE_WINDOW`
  (defaults: 20 requests / 60 s).
- `missing` is derived server-side from the draft, never by the model.

### Seed data

`backend/api/sample_messages.json` and `backend/api/sample_projects.json` hold
realistic seed data. Reset the live files from them with:

```bash
backend\reset-data.bat
```

The `createdAt` values are shifted on reset so the newest record becomes "now" —
keeping the dashboard's today/this-week counts meaningful.

### ML layer (local, not exposed)

A local `llama.cpp` server loads the GGUF model and listens on `127.0.0.1` only —
it is called internally by the API and is never exposed to the public.

```bash
cd backend
run-model.bat    # -> llama-server on http://127.0.0.1:8080 (--no-webui)
```

- On first run, `setup-model.ps1` automatically downloads the llama.cpp runtime into `backend/tools/`.
- Put one or more `.gguf` files in `backend/ml/`; the first one is loaded.
- Override with env vars: `AI_MODEL_PATH` (model file) and `AI_PORT` (default `8080`).

The PHP backend talks to the model via `AI_BASE_URL` / `AI_MODEL` / `AI_TIMEOUT` in `backend/.env`.
The model is only reachable on `127.0.0.1` and is used for the admin chat and the
public form-assist suggestions.

### Prompts

System prompts live in `backend/prompts/*.md` and are composed by `src/prompts.php`.
A module is referenced by file name (without `.md`). Which modules each surface
uses is set in `backend/.env`:

- **Admin chat** (`api/admin/chat.php`): `AI_ADMIN_PROMPTS` (default `persona,domain,admin`)
- **Form assist** (`api/assist.php`): `AI_ASSIST_PROMPTS` (default `assist,assist_goals`)
- `AI_PROMPTS` — generic fallback used when `build_system_prompt()` is called
  without an explicit list

Files:

- `persona.md` — identity, tone and language
- `domain.md` — what Stadtlöwe does and how to read the stored contact/project requests
- `admin.md` — admin chat: tool usage + untrusted-data rules
- `assist.md` — form assist: behavior, tone and output format
- `assist_goals.md` — form assist: goals/target of the feature (edit freely)

To extend a surface, add a new `.md` file in `backend/prompts/` and list its name
in the matching env var.

## Typical development session

```bash
# terminal 1 - local model
cd backend
run-model.bat

# terminal 2 - PHP API
cd backend
serve.bat

# terminal 3 - frontend
cd frontend
npm run dev
```

## Requirements

- Node.js 18+
- PHP 8+
- Windows (for the `.bat` scripts) — the `php -S ...` and `llama-server` commands work on other platforms directly.
