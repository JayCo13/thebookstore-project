# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current deployment

- **Frontend** runs on **Netlify** (`bookstore-ui/`, see `netlify.toml`).
- **Backend is Supabase** — Postgres + Auth + Storage + Edge Functions. `bookstore-ui/src/service/api.js` re-exports `apiSupabase.js`, so everything the app does goes through `supabase-js` or an edge function under **`supabase/functions/`**. Read **`supabase/MIGRATION.md`** for the per-router mapping and the architectural decisions (integer-PK preservation, the `auth_id` bridge, `is_admin()`/`app_user_id()` RLS helpers, edge-function vs. direct-supabase-js split).
- ⚠️ **The FastAPI backend is no longer used.** `bookstore-backend/` is kept for reference only — cutover has happened, the VPS service is retired, and `.github/workflows/deploy-backend.yml` / `docker-compose.prod.yml` no longer deploy anything that serves traffic. **Fix bugs in `supabase/functions/`, not in `bookstore-backend/`**; the two stacks have diverged, and a fix applied to the Python code changes nothing users can see. The FastAPI sections below are retained as a description of the legacy service.

## Repository layout

Monorepo: a Netlify frontend, the Supabase backend it talks to, and the retired FastAPI service:

- `supabase/` — **the live backend.** `functions/` (edge functions, with shared integration modules in `functions/_shared/`), `migrations/` (schema + RLS), `config.toml` (local stack + per-function settings such as `verify_jwt`).
- `bookstore-backend/` — legacy FastAPI service (Python), no longer deployed. Reference only.
- `bookstore-ui/` — React 19 SPA (Create React App). User storefront + admin panel in one bundle.
- `docker-compose.yml` / `docker-compose.prod.yml` — Local + production stacks (MySQL, Redis, backend, optional nginx). The frontend is **not** in compose anymore (deployed to Netlify).
- `nginx/`, `scripts/` — Reverse proxy config and ops scripts (SSL setup, MySQL → Google Drive backups via rclone).
- `.github/workflows/deploy-backend.yml` — Legacy: auto-deployed the FastAPI backend to the VPS. Retired along with the service.
- `.env` (repo root) — Shared dev env file consumed by both Docker Compose **and** the backend's Pydantic settings. `.env.example` is the template.

## Common commands

### Supabase (live backend)

```bash
supabase functions deploy <name>     # deploy one edge function
supabase db push                     # apply supabase/migrations/ to the linked project
supabase secrets set KEY=value       # function env (PAYOS_*, GHN_*, MAIL_*, ...)
```

Function logs live in the dashboard (Functions → *name* → Logs); `supabase
functions logs` does not exist in CLI 2.67, which is what this machine has.

`config.toml` carries per-function settings that must survive redeploys — notably
`[functions.payos-webhook] verify_jwt = false`, without which PayOS's
server-to-server call is rejected 401 before the function ever runs.

### Backend (`bookstore-backend/`, legacy — not deployed)

```bash
# Install + run dev server (loads .env from repo root)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Alembic migrations — generate new, apply, rollback
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1

# One-time: seed ChromaDB from MySQL for the AI chatbot's semantic search
python embed_data.py

# Tests (pytest is in requirements, no test suite checked in yet)
pytest
```

The backend reads its `.env` from the current working directory (`SettingsConfigDict(env_file=".env")`). Run uvicorn from `bookstore-backend/` so the local `.env` (or the symlink/copy of repo-root `.env`) is picked up. `alembic/env.py` reads `DATABASE_URL` from env first, falling back to a localhost MySQL URL.

### Frontend (`bookstore-ui/`)

```bash
npm install
npm start                # dev server on :3000
npm run build            # production build → build/
npm test                 # CRA Jest runner (interactive watch)
CI=false npm run build   # Netlify uses this — see netlify.toml
```

`REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` point the app at the Supabase project (set in Netlify and in `.env`). `REACT_APP_API_URL` only feeds the legacy `api.fastapi.js` client, which nothing imports any more.

### Docker (full stack, dev)

```bash
cp .env.example .env && nano .env   # fill secrets
docker-compose up --build           # MySQL :3307, Redis :6380, backend :8000
docker-compose -f docker-compose.prod.yml up -d --build   # prod stack (adds nginx)
```

Note the non-default exposed ports (`3307`, `6380`) — they avoid collisions with locally-installed MySQL/Redis.

## Architecture

### Backend (`app/`) — legacy FastAPI, not deployed

FastAPI app composed in `app/main.py`. All routers mount under `/api/v1/...`. Static uploads are served at `/static/` from `settings.upload_dir` (default `static/images/`).

- **`config.py`** — Single `Settings` class (pydantic-settings v2). All env vars flow through here. Extras are ignored, so old vars don't break startup. Comma-separated strings (`allowed_origins`, `allowed_extensions`) are parsed via helpers.
- **`database.py`** — SQLAlchemy engine + Redis client. `get_db()` and `get_redis()` are the FastAPI dependencies. **Tables are created via both `Base.metadata.create_all` on startup (in `lifespan`) AND Alembic** — keep models and migrations in sync; the auto-create is a safety net, not the source of truth.
- **`models/models.py`** — All SQLAlchemy models in one file. Note `models/zalo_tokens.py` is separate (Zalo OAuth v4 token storage). Roles are `Admin` / `Customer`; `init_roles` and `create_admin_user` seed them on startup.
- **`auth/auth.py`** + **`middleware/auth_middleware.py`** — JWT (HS256) with passlib `bcrypt_sha256` (new) + legacy `bcrypt` (verify-only). Use `require_admin` / `require_customer_or_admin` dependencies for role gates. `User.is_active` is `0` until email is verified.
- **`routers/`** — One file per resource: `auth`, `books`, `authors`, `categories`, `orders`, `addresses`, `users`, `chat`, `reviews`, `moderation`, `stationery`, `slides`, `notifications`, `seo`, `import_books`. `reviews.books_router` is mounted separately to expose book-scoped review endpoints.
- **`services/`** — External integrations and side-effecting workers: `email_service` (FastMail/SMTP), `image_service` (Pillow resize + WebP), `ghn_service` (Giao Hàng Nhanh shipping API), `zalo_service` (Zalo OA v4 OAuth + ZNS notifications), `google_oauth`, `admin_code_service` (rotating admin login code), `media_service`.
- **`cache/redis_cache.py`** — Pickle-based Redis cache with TTL and pattern-delete helpers.

**Startup lifespan (`main.py`):**
1. Create tables, seed roles + admin user.
2. Initialize admin login code (rotated periodically).
3. Spawn two long-running asyncio tasks: `admin_code_rotation_scheduler` (hourly check) and `zalo_token_refresh_scheduler` (proactively refreshes Zalo OA access tokens 15 min before their ~1h expiry). Both are cancelled on shutdown — if you add another background loop, follow the same cancel-on-shutdown pattern.

**AI chatbot pipeline (`routers/chat.py` + `embed_data.py`):**
- Vector store: ChromaDB persisted to `chroma_db_store/` (path from `settings.chroma_db_path`).
- Embeddings: `dangvantuan/vietnamese-embedding` via `sentence-transformers`. Vietnamese-first.
- LLM: Groq API (`groq_api_key` for chat, `groq_api_key_mod` for the separate review-moderation service).
- Whenever book content changes that should be searchable, re-run `embed_data.py` (or extend it to incremental-sync) — Chroma is **not** auto-synced with MySQL.

### Frontend (`src/`)

Single CRA app with role-split routes in `AppRouter.js`:

- **User routes** (`pages/user/`) wrap a shared `Header` + `Footer`. Vietnamese slugs are first-class (e.g. `/van-phong-pham`, `/cau-hoi-thuong-gap`). Both `:slug` and `:id` route patterns exist for books/stationery — `getBookBySlug` is preferred, with the `:id` route as fallback for legacy links.
- **Admin routes** (`pages/admin/`) live under `/admin/*`, gated by `ProtectedRoute` and rendered inside `AdminLayout`. `/admin/login` is intentionally outside the protected layout.
- **`ConditionalWidgets`** in `AppRouter.js` mounts the `ChatbotWidget` + `NotificationBanner` globally, but hides them on `/admin`, `/login`, `/register`, `/auth/*`, `/verify-email`, `/checkout`. Add new "no-widget" paths there, not inside the widgets.
- **Contexts** (`contexts/`): `AuthContext`, `CartContext`, `WishlistContext`, `ToastContext` — wrap in this order in `App.js`.
- **`service/api.js`** is the single source of truth for backend calls, and since cutover it is a three-line re-export of **`service/apiSupabase.js`** — that is the file to edit. It reads/writes through `supabase-js` and calls edge functions via `invoke()` for the side-effecting flows (`create-order`, `payos-create-link`, `chat`, `moderate-review`, uploads). `service/api.fastapi.js` is the old REST client, kept for reference and imported by nothing.
- **`service/ghnService.js`** talks directly to GHN from the browser using `REACT_APP_GHN_*` keys for province/district/ward dropdowns and shipping-fee preview. The backend has its own `ghn_service.py` for server-side order creation/status sync — don't duplicate logic across the two.
- **`service/grogService.js`** is the chatbot client. If `REACT_APP_GROG_API_URL` / `REACT_APP_GROG_API_KEY` are missing, the widget falls back to a local Vietnamese stub and shows a "Chế độ thử nghiệm" badge. (Note the `grog`/`groq` spelling inconsistency between frontend env vars and backend env vars — it's intentional in the existing code.)

### Cross-cutting concerns

- **Auth flow:** Supabase Auth owns the session (`supabaseClient.js`); `supabase-js` attaches the JWT to every PostgREST and edge-function call, and RLS decides what that user can see via the `auth_id` bridge and the `is_admin()` / `app_user_id()` helpers. An edge function that must run without a user session (`payos-webhook`) has to opt out of the JWT gate in `config.toml`.
- **CORS:** `settings.allowed_origins` is a comma-separated string parsed at boot. Update both `.env` and any production env (Netlify/VPS) when adding a frontend domain.
- **File uploads:** Backend creates `static/images/{books,stationery,optimized}/` on startup. Pillow resizes + converts to WebP via `image_service.py`. `max_file_size` (default 5 MB) and `allowed_extensions` are enforced server-side.
- **Migrations vs. auto-create:** Models are the schema source. Always generate an Alembic revision when you change `models.py` — the startup `create_all` won't apply column alterations, only new tables.
- **Zalo tokens:** Stored in the `zalo_tokens` table. Refresh tokens last ~3 months; access tokens ~1 hour. The startup scheduler refreshes proactively; if the refresh token itself expires, an admin must re-authorize via the OAuth flow.
- **Payments (PayOS)** — live implementation is `supabase/functions/payos-create-link` + `payos-webhook`, sharing `functions/_shared/{payos,ghn,fulfillment,email,orders}.ts`. **COD and PayOS create the order at different times.** COD: `create-order` inserts the order, decrements stock and fulfils inline (GHN + email). PayOS: `create-order` inserts *nothing* — it prices the basket and parks that snapshot in `pending_orders`, returning `{ pending: true, payos_order_code }`; `payos-create-link` builds the checkout link from that row; and `payos-webhook` creates the real order — already `Paid` — when the payment notification lands, then fulfils it with `cod_amount = 0` (the courier collects nothing). Walk away from the payment page and nothing exists but the `pending_orders` row, so there are no dead unpaid orders and no stock held against a payment that never happened. Consequences worth knowing before debugging: the order is priced at checkout and inserted at payment, so the customer is charged the price they were quoted; if the basket sells out in between, the order is still created (the money is taken) and flagged `status = "Cần kiểm tra"`. A payment with no order behind it is a *webhook* problem — check `supabase functions logs payos-webhook`, and remember the JWT gate note above. `fulfillOrder()` is idempotent and the webhook answers 500 on a retryable failure so PayOS redelivers. **If you add another online gateway, reuse `priceOrder`/`insertOrder` from `_shared/orders.ts` the same way rather than inserting the order before the money arrives.**

## Deployment

- **Backend** → Supabase: `supabase db push` for schema, `supabase functions deploy <name>` per function, `supabase secrets set` for function env. Deployment is manual (no CI workflow yet).
- **Backend (legacy)** → the VPS/Docker Compose path and `deploy-backend.yml` are retired; nothing there serves production traffic.
- **Frontend** → Netlify (`netlify.toml`). SPA fallback rewrites `/*` → `/index.html`. Build runs with `CI=false` so CRA warnings don't fail the build.
- **Database backups** → `scripts/backup-mysql-gdrive.sh` runs daily via cron, uploads gzipped dumps to Google Drive via rclone. See `docs/DATABASE_BACKUP.md`.
