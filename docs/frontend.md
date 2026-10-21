# Frontend

React SPA for the public website and the admin dashboard.

## Stack

| Area | Choice |
|------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | `react-router` |
| Styling | CSS Modules + design tokens |
| Icons | `lucide-react` via `Icon` |
| Admin chat | `@chatscope/chat-ui-kit-react` + `react-markdown` |
| API client | `openapi-fetch` + generated OpenAPI types |
| Tests | Vitest, Testing Library, axe, Playwright |
| Serving | nginx in Docker |

## Responsibility

- Public marketing pages and responsive navigation.
- Contact form (`/kontakt`).
- Structured project inquiry (`/projekt-starten`).
- Debounced AI form-assist panel.
- Session-protected admin login, dashboard, records and AI chat.
- Same-origin `/api` calls; nginx proxies to the Node backend.
- SEO metadata, accessibility basics, robots/sitemap and noindex admin routes.

The frontend never talks to MySQL, `ml` or `llama` directly. It only knows the
backend HTTP API.

## Structure

```text
frontend/
  src/
    App.tsx                 routes and public/admin shell
    main.tsx                entry, router, error boundary
    index.css               design tokens and globals
    pages/                  Home, Kontakt, ProjektStarten, admin pages, legal
    sections/               Header, Footer, Hero, Projects, ...
    components/             Button, Icon, Seo, Page, ErrorFallback, ...
    data/                   navigation, services, projects, SEO config
    api/
      client.ts             openapi-fetch client + error helper
      schema.d.ts           generated from backend/openapi.json
      assist.ts             public AI form-assist client
    admin/
      api.ts                admin client: auth, stats, records, SSE chat
      components/           AdminLogin, AdminDashboard, AdminChat, StatCard
      pages/                Admin shell, AdminRecords
  docker/nginx.conf         SPA fallback + /api proxy + security headers
  e2e/smoke.spec.ts         Playwright smoke tests
  Dockerfile
```

## API integration

The backend OpenAPI document is the contract source:

```bash
npm run api:sync          # from repository root
```

This writes `backend/openapi.json` and regenerates
`frontend/src/api/schema.d.ts`. The generated types are committed so Docker
builds do not need the backend source.

```ts
import { api } from "./client";

const { data, error, response } = await api.POST("/api/v1/assist", {
  body: draft,
});
```

### Public forms

- Contact: `POST /api/v1/contact`
- Project: `POST /api/v1/projects`
- AI assist: `POST /api/v1/assist` after a 3 s debounce
- The assist request contains only the draft, never contact data.

### Admin auth

`POST /api/v1/admin/login` sets an `HttpOnly`, `SameSite=Lax` JWT cookie. The
browser uses the cookie automatically; the returned token is intended for mobile
clients. Admin API calls use `credentials: "same-origin"`.

### Streaming chat

`AdminChat` uses:

```text
POST /api/v1/admin/chat/stream
```

Server-Sent Events:

```text
data: {"type":"tool","name":"read_project_requests"}

data: {"type":"token","content":"Es"}

data: {"type":"done","reply":"…"}
```

The UI appends tokens live, shows a typing indicator while tools are being
resolved, and replaces the transient text with the final `done` reply. The
stream is aborted when the user clears the chat or the component unmounts.

## Configuration

| What | Where |
|------|-------|
| Dev API proxy | `vite.config.ts` (`/api` → `localhost:3000`) |
| Production API proxy | `docker/nginx.conf` (`/api` → `backend:3000`) |
| Site domain / canonical | `src/data/seo.ts` (`SITE_URL`) |
| Sitemap domain | `public/sitemap.xml` |
| Navigation | `src/data/navigation.ts` |
| Contact/office data | `src/data/contact.ts` |

The domain in `SITE_URL` and `public/sitemap.xml` is still a placeholder and
must be updated before deployment.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run lint
npm run build
npm run e2e
npm run api:types    # regenerate schema.d.ts from ../backend/openapi.json
```

## Testing

- Unit/component: buttons, links, stat cards, form error association, SEO
  resolver, API clients and the SSE parser.
- Accessibility: axe over the main routes; color contrast must still be checked
  in a real browser.
- E2E: rendering, navigation, not-found/noindex, admin noindex, robots/sitemap.

## Known trade-offs

- SPA rendering only; no SSR/prerender yet.
- Chat history is client-side only.
- The admin login hint uses the default demo credentials; update it when
  replacing the bootstrap admin.
- Large hero image and Google Fonts are not optimized yet.
- Internationalization is German-only.
