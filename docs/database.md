# Database

MySQL 8.4 stores contact requests, project requests and admin accounts.

## Responsibility

- Durable storage for the Node backend.
- Schema migrations and demo seed data.
- UTC timestamps and today/week queries.
- No direct access from the frontend or ML service.

The database is internal-only and has no published host port.

## Stack

| Area | Choice |
|------|--------|
| Engine | MySQL 8.4 |
| Access | `mysql2` with prepared statements |
| Migrations | SQL files applied at backend startup |
| Seed | SQL demo data when the DB is empty |
| Timezone | UTC everywhere |

## Structure

```text
backend/migrations/001_schema.sql       contacts/projects/admins
backend/migrations/002_chat_history.sql chat tables
backend/migrations/003_chat_titles.sql  conversation titles
backend/seeds/demo.sql                realistic demo records
backend/src/scripts/migrate.ts        migration runner
backend/src/scripts/seed.ts           demo seed gate
backend/src/db/pool.ts                connection pool + health
backend/src/db/records.ts             contact/project queries
backend/src/db/admins.ts              admin lookup/upsert
backend/src/db/chat.ts                chat conversations/messages
```

## Tables

### `admins`

| Column | Notes |
|--------|-------|
| `id` | bigint primary key |
| `email` | unique |
| `password_hash` | bcrypt hash |
| `created_at` | UTC |

The password is never stored in plaintext. `ADMIN_PASSWORD` is only used by the
startup script to create/update the hash.

### `contacts`

| Column | Notes |
|--------|-------|
| `id` | 16-char random hex |
| `email`, `phone`, `title`, `message` | contact request |
| `ip` | client IP |
| `created_at` | UTC, indexed |

### `projects`

| Column | Notes |
|--------|-------|
| `id` | 16-char random hex |
| `service` | design/systems/consulting/mix |
| `engagement` | project/longterm |
| `goal` | free text |
| `timeline_kind` / `timeline_date` | optional |
| `budget_range` / `budget_unknown` | optional |
| `contact_*` | name, company, email, phone |
| `consent` | 0/1 |
| `status` | default `new` |
| `ip` | client IP |
| `created_at` | UTC, indexed |
| indexes | created_at, status, service |
| checks | service, engagement, timeline enums |

### `chat_conversations`

| Column | Notes |
|--------|-------|
| `id` | 16-char random hex |
| `admin_email` | owner |
| `title` | first user message snippet, default `Neuer Chat` |
| `created_at` / `updated_at` | UTC |
| index | `(admin_email, updated_at)` |

### `chat_messages`

| Column | Notes |
|--------|-------|
| `id` | auto increment |
| `conversation_id` | FK to `chat_conversations` |
| `role` | `user` or `assistant` |
| `content` | message text |
| `created_at` | UTC |
| cascade | deleting a conversation deletes its messages |

Admins can have multiple conversations. Deleting a conversation cascades to its
messages. The API returns at most 200 messages per conversation.

### `schema_migrations`

| Column | Notes |
|--------|-------|
| `version` | migration filename |
| `applied_at` | UTC |

## Migrations

`migrate.ts`:

1. Waits for MySQL.
2. Creates `schema_migrations`.
3. Applies each `migrations/*.sql` file once, in filename order.
4. Records the version.

The backend entrypoint runs migrations before seeding and starting the API.

To change schema:

1. Add a new `migrations/00N_description.sql`.
2. Do not edit an already-applied migration.
3. Restart the backend container.

## Demo data

`seed.ts` runs only when:

- `SEED_DEMO=1`
- there are no contacts and no projects

It applies `seeds/demo.sql`, which uses `UTC_TIMESTAMP()` intervals so the
dashboard has meaningful today/week counts.

Reset everything:

```bash
docker compose down -v
docker compose up -d
```

`down -v` deletes the database volume.

## Queries

- Writes use parameterized `INSERT`.
- Reads use parameterized `SELECT`.
- Dynamic filters are limited to known columns: `since`, `service`, `status`.
- Limits are clamped before interpolation.
- `recordCounts()` computes today/week/total in SQL.
- `readAdminRecords()` is shared by the admin UI and the AI tools.

## Security

- MySQL has no published host port.
- Only the backend is on the internal network with DB access.
- Credentials come from Compose environment variables.
- ML and llama have no DB credentials.
- SQL is parameterized; model/user input never becomes SQL text.
- Admin passwords are bcrypt hashes.

## Known trade-offs

- Single MySQL instance; no replica/failover configuration.
- Chat history has manual per-conversation deletion only; no automated retention
  policy or message pagination.
- No retention/deletion workflow for contact/project PII yet.
- Project status has no update endpoint yet; “open” means `status = 'new'`.
- Backups are not automated in this demo setup.
- In-process rate limiting is not stored in the DB; multiple backend replicas
  need Redis or a DB-backed limiter.
