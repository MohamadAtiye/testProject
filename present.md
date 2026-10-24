# Stadtlöwe — Interview Project

A full-stack demo of a website, a session-protected admin dashboard and a **fully local AI assistant** (no cloud LLM), running as five Docker containers.

## Architecture

```text
Browser
  └─ frontend (React + nginx :8080)
       └─ /api/* ──> backend (Fastify + TS)
                       ├─ MySQL 8.4
                       └─ ml (FastAPI)
                            └─ llama (llama.cpp + GGUF)
```

Only the frontend is published. Backend, ML, llama and MySQL have **no host
ports**; the browser can only reach `/api` through nginx.

| Service | Stack | Role |
|---------|-------|------|
| `frontend` | React 19, Vite, CSS Modules, openapi-fetch | Public site + admin UI |
| `backend` | Node 22, Fastify 5, TypeScript, Zod | Auth, data, validation, AI orchestration |
| `ml` | Python 3.12, FastAPI, httpx | Prompts, llama calls, output repair, evals |
| `llama` | llama.cpp server (CUDA) | Local inference |
| `db` | MySQL 8.4 | Contacts, projects, admins, chat history |

## Main points

- **Clear ownership per service.** The backend owns authorization, SQL, tools
  and the tool loop; ML owns prompts and model behavior; the model never
  touches the database. Each boundary is documented.
- **Contract-first API.** Zod schemas generate OpenAPI 3.1; frontend types are
  generated from the spec (`npm run api:sync`), so drift is caught by the
  compiler.
- **Security treated as a design constraint.** Internal-only network, JWT with
  issuer/audience/role checks, bcrypt, Origin/Referer checks on cookie writes,
  rate limiting, prompt-injection wrapping, read-only whitelisted tools.
- **Pragmatic local-AI engineering.** Small models are unreliable at streaming
  tool calls, so tool decisions run non-streaming and only the final answer is
  streamed token-by-token over SSE.
- **Verifiable.** Unit/component tests, axe accessibility tests, Playwright
  smoke tests, prompt regression evals, typecheck and build in the README.
- **Documented honestly.** One doc per service, each ending in known trade-offs
  and next steps.

## Focus points per service

Each is a deliberate decision, not an accident.

### Frontend
- **Generated API types**: `schema.d.ts` comes from the backend OpenAPI spec, so
  a renamed field fails `tsc` instead of failing in production.
- **Live AI form assist**: 3s debounce + `AbortController`, sends drafts only
  (never contact data), renders summary, suggestions and missing fields.
- **SSE chat UX**: tokens stream live, typing indicator while tools resolve,
  transient text replaced by the final `done` reply, stream aborted on
  chat switch/unmount.
- **Conversation sidebar**: create/switch/delete persisted chats, ownership
  enforced server-side.
- **Self-hosted variable fonts** (Inter, Montserrat) with preload and
  `font-display: swap`; SEO metadata, sitemap/robots and noindex admin routes.
- **Testing beyond happy path**: axe accessibility, form error association,
  SSE parser, SEO resolver.

### Backend
- **Bounded tool loop** (`MAX_ITERATIONS = 4`) with a final no-tools call to
  guarantee an answer — no infinite agent loops.
- **Two-path streaming**: non-streaming tool resolution, then streamed final
  answer. This is the single best architecture story in the project.
- **Defense in depth**: tools are whitelisted, argument-validated with Zod,
  read-only, result-wrapped as `<untrusted_data>`; unknown tool → safe error.
- **Auth that survives migration**: HttpOnly cookie for web, Bearer for mobile,
  identical verification, dummy bcrypt compare to reduce timing leaks. Local
  login is explicitly a bridge to future OIDC.
- **Runtime-validated config** and request IDs propagated nginx → Node → Python
  → llama.
- **Migrations and demo seeds at startup**, gated by `SEED_DEMO=1` and empty
  tables, with relative timestamps so "today/this week" stats look real.

### ML service
- **Prompts as files, not code**: composable modules (`persona`, `domain`,
  `admin`, `assist`, `assist_goals`) selected by env, so behavior changes are
  reviewable diffs.
- **Output repair**: extracts JSON from prose, strips, caps lengths and limits
  suggestions — small models are messy, and this makes the contract reliable.
- **Prompt regression evals** (`eval_assist.py`) run against the same prompt
  modules and parser as production; fail on bad shape, length or invented URLs.
- **Hard separation**: no DB credentials, no tool execution, shared Bearer key,
  `<untrusted_data>` on all customer text.
- **Observability**: Prometheus metrics and request-ID-aware logs.

### llama / inference
- **Entirely local**: GGUF model mounted read-only, no external API, no data
  leaving the machine.
- **Tuned runtime**: flash attention, quantized KV cache (`q8_0`), context and
  GPU-layer settings exposed via `.env`, CPU fallback documented.
- **Honest limitation handling**: one model per container, single slot, and a
  clear note on why streaming tool-call JSON is avoided.

### Database
- **SQL migrations applied once, in order**, tracked in `schema_migrations`;
  never edit an applied migration.
- **Parameterized access only**, dynamic filters limited to known columns, limits
  clamped before interpolation — model input can never become SQL.
- **Server-side aggregation** for today/week/total counts, UTC everywhere.
- **Cascade delete** for chat messages and an index on
  `(admin_email, updated_at)` for the conversation list.

### Infra / DevOps
- **Two Docker networks**: `public` (nginx + backend) and `internal`
  (backend, ML, llama, DB). The ML service is unreachable from the browser by
  construction.
- **Health checks and dependency ordering** (`db` healthy → backend → frontend),
  non-root nginx, security headers on both nginx and Node.
- **One-command reproducibility**: `.env.example` → `docker compose up --build`.

## Trade-offs I can talk about

- JWT is locally issued; OIDC/SSO is the next step. No refresh-token rotation.
- In-process rate limiting — needs Redis for multiple replicas.
- SPA only, no SSR/prerender; German-only.
- Chat history has manual deletion but no retention policy or pagination.

## Run it

```bash
cp .env.example .env          # add a .gguf path if you want live AI
docker compose up --build
# site  http://localhost:8080
# admin http://localhost:8080/admin
# docs  http://localhost:8080/api/docs
```

```bash
cd backend  && npm run typecheck && npm test && npm run build
cd ml       && pytest
cd frontend && npm test && npm run lint && npm run build && npm run e2e
```


## Product roadmap — highest business value first

Business-facing features only. Effort is rough sizing for planning, not an
engineering estimate.

| Feature | Business value | Effort |
|---------|----------------|--------|
| **Lead pipeline & status tracking** | Move requests through *new → contacted → proposal → won/lost* with an owner and notes. Replaces an inbox with a sales process and makes conversion visible. | Medium |
| **Live lead notifications** | New contacts and projects appear instantly on the dashboard, plus optional email/Slack alerts. Respond while interest is still hot. | Quick win |
| **AI lead summaries & scoring** | Automatically summarise each inquiry and score fit by service, budget and timeline. The team triages dozens of leads in seconds. | Medium |
| **AI reply drafting** | One-click, editable, personalised follow-up email per lead in the brand voice. Cuts response time and admin hours. | Medium |
| **Public website assistant** | Visitor-facing AI answering service, pricing and process questions, then capturing a qualified inquiry. A visible differentiator versus competitor sites. | Medium |
| **Appointment booking** | Let prospects book a call directly from the site, synced to the team calendar. Fewer email round-trips, higher conversion. | Medium |
| **Customer status notifications** | Automatic email when an inquiry changes status. Reduces manual follow-up and keeps clients informed. | Quick win |
| **Content management** | Marketing edits pages, projects and testimonials without a developer or deploy. Faster campaign turnaround. | Medium |
| **Search, filters, CSV export & scheduled reports** | Find any lead quickly and share pipeline value with stakeholders on a schedule. | Quick win |
| **Team accounts & roles** | Sales vs. admin permissions and per-owner lead access. Required to grow beyond a single administrator. | Medium |
| **Analytics & conversion funnel** | Which services, pages and channels actually generate inquiries. Spend follows evidence instead of intuition. | Quick win |
| **Multilingual site (DE/EN) + local SEO** | Reach international clients and improve local search visibility. | Medium |
| **Accessibility & GDPR self-service** | WCAG/BFSG-oriented compliance, plus customer data export and deletion. Reduces legal risk and builds trust in the brand. | Medium |
