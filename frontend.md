# Frontend

The Stadtlöwe web application: a responsive React SPA that presents the agency
website (design, systems, consulting), receives business requests through
contact and project forms, and provides a session-protected admin area with a
local-AI assistant.

For backend/API and model details see the root [README.md](./README.md).

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | `react-router` (SPA, `BrowserRouter`) |
| Styling | CSS Modules + design tokens in `src/index.css` |
| Icons | `lucide-react` via a thin `Icon` wrapper |
| Admin chat UI | `@chatscope/chat-ui-kit-react` + `react-markdown` |
| Unit/component tests | Vitest + Testing Library + jsdom + `axe-core` |
| E2E tests | Playwright (Chromium) |
| Lint | ESLint 10 (flat config) |

The public bundle is ~314 KB (98 KB gzip); the admin area (chatscope +
react-markdown) is **lazy-loaded** so public visitors never download it.

---

## Running

```bash
cd frontend
npm install
npm run dev            # dev server -> http://localhost:5173 (proxies /api -> :8000)
npm run build          # type-check + production build -> frontend/dist
npm run preview        # serve the production build

npm test               # unit/component tests
npm run coverage       # coverage report
npm run e2e            # Playwright smoke tests (needs `npx playwright install chromium`)
npm run lint           # ESLint
```

In development, `/api/*` is proxied to the PHP API at `http://localhost:8000`
(see `vite.config.ts`).

---

## Structure

```
src/
  App.tsx                 Routes + layout shell (header/footer, admin split)
  main.tsx                Entry: StrictMode, ErrorBoundary, BrowserRouter
  index.css               Design tokens (colors, type, easing) + global styles

  pages/                  Route screens
    Home, UeberUns, Kontakt, ProjektStarten, Projekte,
    Design, Systems, Consulting, Impressum, Datenschutz, NotFound

  sections/               Page-level layout blocks
    Header, Footer, Hero, ServicesStrip, Pillars, BrandIntro, Projects

  components/             Reusable UI
    Button, Icon, Logo, Container, Page, ArrowLink,
    ScrollToHash, Seo, TopNav, ErrorFallback

  data/                   Static content + config
    navigation, services, pillars, projects, values, contact, seo

  api/
    assist.ts             Client for the public AI form-assist endpoint

  admin/                  Session-protected area (lazy-loaded)
    api.ts                Admin API client (session, stats, records, chat)
    components/           AdminLogin, AdminDashboard, AdminChat, StatCard,
                          DataTable, ExpandableText
    pages/                Admin (shell/routing), AdminRecords (tables)

  test/setup.ts           Vitest setup (jest-dom, jsdom shims)

e2e/smoke.spec.ts         Playwright smoke tests
vitest.config.ts          Vitest config
playwright.config.ts      Playwright config (runs against `vite preview`)
```

---

## Functions

### Public website

- **Responsive marketing pages** for Home, Über uns, Projekte, Design, Systems,
  Consulting, Impressum, Datenschutz. Fluid sizing (`clamp()`), 26 media
  breakpoints, and a collapsible mobile navigation (`Header` + `TopNav`).
- **Contact form** (`/kontakt`): posts to `/api/contact.php`, shows field-level
  errors, success and error states.
- **Projekt starten** (`/projekt-starten`): structured request form (service,
  engagement, goal, optional timeline/budget, contact, consent).

### AI form assist (`/projekt-starten`)

- Debounced (5 s after the visitor pauses) call to `/api/assist.php` via
  `src/api/assist.ts`, sending only the draft (no contact data).
- Renders a friendly **Assistent** panel: summary, suggestion list, "Noch offen"
  chips, an animated thinking indicator + skeleton while loading, and a static
  note that suggestions are optional.
- The AI never has data access here; it only returns structured suggestions.

### Admin area (`/admin`, session-protected)

- **Login** (`AdminLogin`) → `POST /api/admin/login.php`; session via cookie.
- **Dashboard** (`AdminDashboard`): stat cards for contact requests, project
  requests and **open projects** (leads still `status: "new"`), each with
  today/this-week counts.
- **Records** (`AdminRecords`): sortable/expandable tables for contact and
  project requests.
- **AI chat** (`AdminChat`, chatscope): chats with the local model, which can
  read stored requests through read-only backend tools. Styled dark, auto-scroll
  to newest, avatars, markdown rendering, starter suggestion pills on empty
  state, and a "Verlauf leeren" action.
- 401 responses from any admin call log the user out.

### Cross-cutting

- **SEO**: per-route `title` / `description` / canonical / Open Graph / Twitter
  via `Seo.tsx` (React 19 native document metadata) driven by `data/seo.ts`.
  Admin and unknown routes are `noindex`. `public/robots.txt` and
  `public/sitemap.xml` ship with the build; a static JSON-LD `Organization`
  block lives in `index.html`.
- **Accessibility**: skip link, visible `:focus-visible` outlines,
  `prefers-reduced-motion` handling, labelled nav/landmarks, and form errors
  associated with inputs via `aria-invalid` + `aria-describedby`.
- **Error handling**: a top-level `ErrorBoundary` renders `ErrorFallback`.

---

## Testing & quality

- **Unit/component** (`*.test.tsx`): buttons/links, stat cards, the contact
  form's error association, the SEO resolver, and both API clients (success,
  error, 401, network failure). Run with `npm test`.
- **Accessibility** (`App.a11y.test.tsx`): runs **axe** over the main routes and
  asserts zero violations. Color contrast is excluded here (jsdom has no
  rendering) and must be checked in a browser.
- **E2E** (`e2e/smoke.spec.ts`): real-browser smoke tests for rendering,
  navigation, not-found/noindex, admin noindex, and served robots/sitemap.

---

## Configuration

| What | Where |
|------|-------|
| API proxy (dev) | `vite.config.ts` |
| Site domain (canonical/OG) | `src/data/seo.ts` (`SITE_URL`) |
| Sitemap domain | `public/sitemap.xml` |
| Nav links | `src/data/navigation.ts` |
| Contact/office info | `src/data/contact.ts` |

> Replace the placeholder domain `https://stadtloewe.de` before deploying.

---

## Remaining future improvements

**SEO / delivery**
- **SSR or prerendering** (e.g. `vite-react-ssg`) so public pages have real
  HTML, correct metadata and content for crawlers and no-JS clients. The SPA
  metadata only benefits JS-rendering crawlers today.
- Generate the sitemap from the route table instead of hardcoding it.
- Add `lastmod`/structured data per page (e.g. `Service`, `BreadcrumbList`).

**Performance**
- Optimize images: responsive `srcset`, modern formats (AVIF/WebP), lazy loading
  below the fold (the hero image is ~225 KB).
- Revisit fonts (self-hosting / `font-display`) to remove the Google Fonts
  round-trip.
- Add a bundle budget and Lighthouse/CI performance check.

**Testing**
- More integration tests: `ProjektStarten` assist debounce/abort, `AdminChat`
  flow, `AdminRecords` rendering.
- E2E for admin flows against a running backend (login → dashboard → records →
  chat).
- Wire `lint`, `test`, `build` and `e2e` into CI.

**Accessibility**
- Browser-based audit (Lighthouse / axe DevTools) including color contrast.
- Keyboard/trap focus handling for the mobile menu and any modals.
- Confirm screen-reader behavior for the live assist panel and admin chat.

**Features / UX**
- Persist the project-form draft (localStorage) so a refresh doesn't lose input.
- Streaming responses for the admin chat (SSE) for a token-by-token effect.
- Internationalization (currently German only).
- Surface project `status` changes in the UI so "Offene Projekte" reflects
  real workflow (backend dependency).
- Toasts/undo for admin actions; empty/loading states polish across tables.

**Maintainability**
- Adopt a component gallery (Storybook) for the design system.
- Centralize API base URLs/error mapping; share types with the backend.
- Add analytics/error monitoring (privacy-respecting).
