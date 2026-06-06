# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current deployment & active migration

- **Frontend** runs on **Netlify** (`bookstore-ui/`, see `netlify.toml`).
- **Backend** currently runs on a **VPS** via Docker Compose (`bookstore-backend/`, FastAPI — see `docker-compose.prod.yml` + `.github/workflows/deploy-backend.yml`).
- 🚧 **In progress: the FastAPI backend is being fully replaced by Supabase** (Postgres + Auth + Storage + Edge Functions). The frontend stays on Netlify; the VPS/FastAPI service will be retired at cutover. All migration work lives under **`supabase/`** — read **`supabase/MIGRATION.md`** first; it tracks phase status, the per-router/service mapping to Supabase, and architectural decisions (integer-PK preservation, the `auth_id` bridge, `is_admin()`/`app_user_id()` RLS helpers, edge-function vs. direct-supabase-js split). Until cutover, the FastAPI backend remains the source of truth in production — keep `bookstore-backend/` working unless a change is explicitly part of the Supabase migration.

## Repository layout

Monorepo with two deployable apps and shared infra:

- `bookstore-backend/` — FastAPI service (Python). Database, business logic, AI chatbot, integrations.
- `bookstore-ui/` — React 19 SPA (Create React App). User storefront + admin panel in one bundle.
- `docker-compose.yml` / `docker-compose.prod.yml` — Local + production stacks (MySQL, Redis, backend, optional nginx). The frontend is **not** in compose anymore (deployed to Netlify).
- `nginx/`, `scripts/` — Reverse proxy config and ops scripts (SSL setup, MySQL → Google Drive backups via rclone).
- `.github/workflows/deploy-backend.yml` — Auto-deploys backend to VPS over SSH when files under `bookstore-backend/app/`, `requirements.txt`, or `Dockerfile` change on `main`.
- `.env` (repo root) — Shared dev env file consumed by both Docker Compose **and** the backend's Pydantic settings. `.env.example` is the template.

## Common commands

### Backend (`bookstore-backend/`)

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

`REACT_APP_API_URL` controls the backend base URL (defaults to `http://localhost:8000`). `api.js` force-rewrites `http://` → `https://` for any non-localhost API URL to avoid mixed-content errors in production.

### Docker (full stack, dev)

```bash
cp .env.example .env && nano .env   # fill secrets
docker-compose up --build           # MySQL :3307, Redis :6380, backend :8000
docker-compose -f docker-compose.prod.yml up -d --build   # prod stack (adds nginx)
```

Note the non-default exposed ports (`3307`, `6380`) — they avoid collisions with locally-installed MySQL/Redis.

## Architecture

### Backend (`app/`)

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
- **`service/api.js`** is the single source of truth for backend calls. It owns auth token storage (dual-keyed for legacy compatibility: `localStorage.authToken` *and* the `access_token` field inside `localStorage.user`). Custom `ApiError` carries `status` and `data`. Prefer the named exports at the bottom of `api.js` over reaching into `apiService` directly.
- **`service/ghnService.js`** talks directly to GHN from the browser using `REACT_APP_GHN_*` keys for province/district/ward dropdowns and shipping-fee preview. The backend has its own `ghn_service.py` for server-side order creation/status sync — don't duplicate logic across the two.
- **`service/grogService.js`** is the chatbot client. If `REACT_APP_GROG_API_URL` / `REACT_APP_GROG_API_KEY` are missing, the widget falls back to a local Vietnamese stub and shows a "Chế độ thử nghiệm" badge. (Note the `grog`/`groq` spelling inconsistency between frontend env vars and backend env vars — it's intentional in the existing code.)

### Cross-cutting concerns

- **Auth flow:** Login response carries `access_token`; `api.js` stores it and adds `Authorization: Bearer …` to every subsequent request. Backend `get_current_user` looks up the user by email claim and rejects inactive accounts.
- **CORS:** `settings.allowed_origins` is a comma-separated string parsed at boot. Update both `.env` and any production env (Netlify/VPS) when adding a frontend domain.
- **File uploads:** Backend creates `static/images/{books,stationery,optimized}/` on startup. Pillow resizes + converts to WebP via `image_service.py`. `max_file_size` (default 5 MB) and `allowed_extensions` are enforced server-side.
- **Migrations vs. auto-create:** Models are the schema source. Always generate an Alembic revision when you change `models.py` — the startup `create_all` won't apply column alterations, only new tables.
- **Zalo tokens:** Stored in the `zalo_tokens` table. Refresh tokens last ~3 months; access tokens ~1 hour. The startup scheduler refreshes proactively; if the refresh token itself expires, an admin must re-authorize via the OAuth flow.
- **Payments (PayOS):** COD orders are submitted to GHN + notified via ZNS inline during `POST /orders/`. PayOS orders skip both — they're created Unpaid, the frontend gets a checkout URL from `POST /payments/payos/create-link` and redirects. PayOS hits `POST /payments/payos/webhook` server-to-server; the webhook verifies the HMAC signature with `payos_checksum_key`, marks the order Paid, then calls `app/services/order_fulfillment.py` to (a) submit to GHN with `cod_amount=0` (courier collects nothing — customer already paid) and (b) send the ZNS with payment_method "Đã thanh toán PayOS". Both fulfillment steps are idempotent so PayOS retries are safe. **If you add another online gateway, branch in `orders.py create_order` to set `is_payos` analog and add it to the prepaid branches in `ghn_service.py prepare_order_data_from_request` + `create_order` so cod_amount/payment_type_id are correct.**

## Deployment

- **Backend** → VPS via Docker Compose (`docker-compose.prod.yml`). The GitHub Action SSHes in, `git pull`s, rebuilds only the `backend` service, prunes dangling images. Requires repo secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PROJECT_DIR`.
- **Frontend** → Netlify (`netlify.toml`). SPA fallback rewrites `/*` → `/index.html`. Build runs with `CI=false` so CRA warnings don't fail the build.
- **Database backups** → `scripts/backup-mysql-gdrive.sh` runs daily via cron, uploads gzipped dumps to Google Drive via rclone. See `docs/DATABASE_BACKUP.md`.
