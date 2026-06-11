# GuruSikshan Monorepo

A three-part production system for admin operations, AI personalization, and authenticated teacher/admin workflows. The repo is organized as a monorepo with a Python AI service, a TypeScript backend API, and a React/Vite dashboard frontend.

## What lives here

| Package | Stack | Purpose |
|---|---|---|
| `packages/ai-personalization` | Python + Supabase + RAGFlow | Public auth, public chat, lesson planning, retrieval, token utilities, middleware, and AI service orchestration. |
| `packages/backend-api` | Node.js + Express + TypeScript | Main secure API, JWT auth, admin routes, dashboard routes, Supabase access, and proxying to the AI service at `/api/public`. |
| `packages/frontend-dashboard` | React + Vite + TypeScript | Admin dashboard UI, auth context, API client, pages, and shared components for teachers, issues, modules, feedback, and admin management. |

## Architecture

The frontend talks only to the backend API, and the backend API proxies AI traffic to `AI_SERVICE_URL`, which defaults to `http://localhost:5001` in the codebase. The backend enforces JWT auth for protected routes, while the AI service handles its own public auth and chat paths, which keeps responsibilities clean and avoids direct browser access to the Python service.

## Run the whole stack

The intended local startup flow is from the repository root:

```bash
docker compose up --build
```

That should bring up the frontend, backend API, and AI service together if your root `docker-compose.yml` wires the three packages correctly. Once the stack is healthy, open the URL exposed by your compose setup.The ports set originally are `5001` for `AI_SERVICE_URL` , `3000` for `backend-api` and `5173` for `frontend`. Leave the configuration as is and access the network via localhost, if any changes are needed then make sure that the backend CORS in package `index.ts` in `backend-api` matches for the same. 

## Run package by package

### AI personalization service

```bash
cd packages/ai-personalization
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd src
python app.py
```

This service should listen on port `5001` so the backend proxy configuration remains compatible with the current defaults.

### Backend API

```bash
cd packages/backend-api
npm install
npm run dev
```

For production builds:

```bash
npm run build
npm start
```

The backend is already set up to run from compiled `dist/index.js` in production and exposes health, dashboard, and admin routes.

### Frontend dashboard

```bash
cd packages/frontend-dashboard
npm install
npm run dev
```

The dashboard uses Vite, React Router, local UI primitives, and a secured API client that reads the backend JWT from local storage.

## Production deployment

- `frontend-dashboard` builds to static assets and is served behind Nginx in its container.
- `backend-api` runs Node/Express from compiled TypeScript.
- `ai-personalization` runs Python on `5001` behind the backend proxy.

## Environment variables

### Backend API

| Variable | Purpose |
|---|---|
| `PORT` | Express port, typically `3000`. |
| `AI_SERVICE_URL` | Base URL for the AI service proxy, defaulting to `http://localhost:5001` locally. |
| `DB_URL` | Postgres connection string if used by `db.ts`. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key for server-side access. |
| `JWT_SECRET` | JWT signing and verification secret. |
| `RAGFLOW_API_KEY` | RAGFlow API key if applicable. |

### AI personalization

| Variable | Purpose |
|---|---|
| `PORT` | Service port, recommended `5001`. |
| `HOST` | Bind host, usually `0.0.0.0` in Docker. |
| `SUPABASE_URL` | Supabase URL for backend access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase key. |
| `JWT_SECRET` | Shared signing or verification secret. |
| `RAGFLOW_BASE_URL` | Base URL for RAGFlow or Flask gateway. |
| `RAGFLOW_API_KEY` | RAGFlow key if required by your setup. |

### Frontend dashboard

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL. |
| `VITE_SUPABASE_URL` | Supabase URL used by the frontend client config. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for browser-safe client config. |

## Dev workflow

1. Start the entire stack with `docker compose up --build` from the repo root.
2. For frontend-only UI work, run the Vite app in `packages/frontend-dashboard`.
3. For backend route changes, run the Express API in `packages/backend-api`.
4. For retrieval/chat or AI orchestration changes, run `python app.py` in `packages/ai-personalization/src`.


## Quick start

```bash
# whole stack
cd <repo-root>
docker compose up --build

# backend
cd packages/backend-api
npm run dev

# frontend
cd packages/frontend-dashboard
npm run dev

# ai service
cd packages/ai-personalization
cd src
python app.py
```
