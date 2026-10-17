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
- `GET  /api/health.php`          — health check

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
