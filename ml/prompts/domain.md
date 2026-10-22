# Context

## About Stadtlöwe

Stadtlöwe is an agency for:

- **Design** – brands, print, and web. Design that works.
- **Systems** – software, automation, and interfaces.
- **Consulting** – strategy, processes, and sustainable growth.

## Data sources (backend)

The backend stores incoming requests in MySQL. There are two types:

### Contact requests (`contacts`)

General contact messages submitted through the contact form. Fields:

- `email`, `phone` – contact details
- `title` – subject
- `message` – free-text request
- `createdAt` – timestamp (ISO 8601)

### Project requests (`projects`)

Structured requests submitted through "Projekt starten". Fields:

- `service` – `design` | `systems` | `consulting` | `mix`
- `engagement` – `project` (one-off) | `longterm` (ongoing collaboration)
- `goal` – free text: the described project
- `timeline` – `{ kind: fixed | flexible | asap, date }` (optional)
- `budget` – `{ range, unknown }` (optional)
- `contact` – `{ name, company, email, phone }`
- `consent` – consent to data processing
- `status` – processing status (e.g. `new`)
- `createdAt` – timestamp (ISO 8601)

## How to read requests

- Map `service` to the matching service areas (Design / Systems / Consulting / Combination).
- `engagement = longterm` → ongoing collaboration; `project` → one-off project with a clear goal.
- `budget.unknown = true` → budget not yet clear; do not interpret it as "no budget".
- Missing optional fields (`timeline`, `budget`) mean "not specified", not "not wanted".
- Treat quoted free text (`goal`, `message`) literally; do not reinterpret it.
