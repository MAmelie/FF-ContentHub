# Environment variables

Env files are **not committed**. Use this document as the master reference. Fill in the **Production values** column when handing off (maintainer can add exact Netlify / Railway entries later).

## Quick map: where each var lives

| Location | Used by |
|----------|---------|
| `frontend/.env.local` | Local Next.js dev + index rebuild script |
| Netlify → Site → Environment variables | Production frontend build & runtime |
| `backend/.env` | Local Strapi |
| Railway → Strapi service → Variables | Production Strapi |
| Strapi Admin → Settings → Providers | Discord Client ID / Secret (not env vars, but required) |

---

## Frontend (Netlify + local)

Copy `frontend/.env.example` to `frontend/.env.local` for local work.

| Variable | Required | Description | Production value |
|----------|----------|-------------|------------------|
| `NEXT_PUBLIC_STRAPI_URL` | Yes | Strapi base URL (no trailing slash) | _TODO — Railway Strapi URL_ |
| `NEXT_PUBLIC_APP_URL` | No | Canonical frontend URL; fixes OAuth redirect when Netlify preview URL differs from production domain | _TODO — e.g. https://memberportal.feedforward.ai_ |
| `NEXT_PUBLIC_BYPASS_AUTH` | No | `true` = skip Discord login (**local only**). Unset or `false` in production | _Must not be `true` in prod_ |
| `NEXT_PUBLIC_CALENDLY_EXPERT_SESSION_URL` | No | Calendly event URL after booking form submit | _TODO if used_ |
| `NETLIFY_NEXT_SKEW_PROTECTION` | Recommended | `true` on Netlify — reduces chunk 404s after deploy | `true` |

### Server-side / build (frontend)

Set on Netlify for semantic search API routes; also used locally in `.env.local`.

| Variable | Required | Description | Production value |
|----------|----------|-------------|------------------|
| `OPENAI_API_KEY` | For search | Embeddings at runtime (`/api/search/documents`) | _TODO — secret_ |
| `OPENAI_EMBEDDING_MODEL` | No | Default `text-embedding-3-small` | |
| `EMBEDDING_PROVIDER` | No | `openai` or `gemini` | |
| `GEMINI_API_KEY` | If gemini | Required when `EMBEDDING_PROVIDER=gemini` | |
| `GEMINI_EMBEDDING_MODEL` | No | Default `text-embedding-004` | |
| `STRAPI_URL` | For index rebuild | Same as public Strapi URL; used by `npm run rebuild:document-index` | _TODO_ |
| `STRAPI_API_TOKEN` | Sometimes | Strapi API token if documents/uploads are not public | _TODO_ |
| `USE_MOCK_EMBEDDINGS` | No | `true` for local testing without OpenAI billing | `false` in prod |
| `MAX_DOCS` | No | Limit docs when rebuilding index (dev) | |
| `SEARCH_MIN_SCORE` | No | Min similarity score (default `0.2`) | |
| `SEARCH_DYNAMIC_DELTA` | No | Dynamic threshold delta (default `0.08`) | |
| `SEARCH_DEBUG_LOG` | No | `true` for verbose search logs | |

> **Note:** `NEXT_PUBLIC_*` vars are embedded in the client bundle. Never put secrets in `NEXT_PUBLIC_*`.

---

## Backend / Strapi (Railway + local)

Copy `backend/.env.example` to `backend/.env` for local work. Generate secrets: `node scripts/generate-strapi-secrets.js` from repo root.

| Variable | Required | Description | Production value |
|----------|----------|-------------|------------------|
| `HOST` | Yes | Bind address (`0.0.0.0` on Railway) | `0.0.0.0` |
| `PORT` | Yes | Strapi port (Railway often injects `PORT`) | _Railway default_ |
| `NODE_ENV` | Prod | `production` on Railway | `production` |
| `APP_KEYS` | Yes | Comma-separated keys | _TODO — from secrets generator_ |
| `API_TOKEN_SALT` | Yes | | _TODO_ |
| `ADMIN_JWT_SECRET` | Yes | | _TODO_ |
| `TRANSFER_TOKEN_SALT` | Yes | | _TODO_ |
| `JWT_SECRET` | Yes | User JWT signing | _TODO_ |
| `ENCRYPTION_KEY` | Yes | | _TODO_ |
| `DATABASE_CLIENT` | Prod | `postgres` | `postgres` |
| `DATABASE_URL` | Prod | Postgres connection string | _TODO — Railway Postgres service_ |
| `FRONTEND_URL` | Yes (prod) | Netlify site URL for CORS | _TODO — frontend URL_ |
| `PUBLIC_URL` | Yes (prod) | Public Strapi URL (OAuth, cookies behind proxy) | _TODO — Railway Strapi URL_ |
| `DISCORD_ALLOWED_GUILD_ID` | Recommended | Only members of this Discord server can log in | _TODO — Feedforward server ID_ |
| `SEED_EXPERT_NET_FAQ` | No | `force` to overwrite FAQ seed on startup (local/dev) | Usually unset in prod |

### Discord OAuth (Strapi Admin, not `.env`)

Configure in **Settings → Users & Permissions → Providers → Discord**:

- Client ID / Client Secret (from Discord Developer Portal)
- Redirect URL to frontend: `https://YOUR_FRONTEND/connect/discord/redirect`

Discord Developer Portal redirect:

- `https://YOUR_STRAPI/api/connect/discord/callback`

See [operations/discord-auth.md](./operations/discord-auth.md).

---

## Railway-only: volume mount

Not an environment variable — configure in Railway UI. See [railway-storage.md](./railway-storage.md).

| Setting | Typical value |
|---------|----------------|
| Mount path | `/app/public/uploads` (or project-relative `public/uploads`) |
| Purpose | Persist uploaded media across redeploys |

---

## Scripts (local machine)

| Variable | Used by |
|----------|---------|
| `STRAPI_URL` | `bulk-import-documents.js`, `bulk-update-document-categories.js` |
| `STRAPI_API_TOKEN` | Same — API token with Document + Upload permissions |

---

## Maintainer: fill in production inventory

_Add a subsection below listing every variable actually set in Netlify and Railway (names only, values in password manager):_

### Netlify (site: _TODO site name_)

```
# Example — replace with your list
NEXT_PUBLIC_STRAPI_URL=
NEXT_PUBLIC_APP_URL=
NETLIFY_NEXT_SKEW_PROTECTION=true
OPENAI_API_KEY=
...
```

### Railway — Strapi service

```
FRONTEND_URL=
PUBLIC_URL=
DATABASE_URL=          # often linked from Postgres plugin
APP_KEYS=
...
```

### Railway — PostgreSQL

```
# Usually only DATABASE_URL reference on Strapi service
```
