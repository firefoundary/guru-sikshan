# AI Personalization Service

AI Personalization is the Python service that powers authenticated public chat and personalization workflows for the broader DIET platform. It sits behind the main backend API, talks to Supabase and RAGFlow, and can be run either through Docker Compose from the repository root or directly with `python app.py` from `src/`.

## What it does
- Its main aim is to connext the broader backend to RAGFlow and add authentication for the same.
- This service exposes public-facing auth and chat routes, includes client token utilities, request authentication middleware, audit logging, rate limiting, RAGFlow integration, lesson-planner support, and Supabase-backed data access based on the project structure provided. In the larger system, the Node backend proxies `/api/public` traffic to the AI service using `AI_SERVICE_URL`, so this service is normally consumed through the main backend rather than directly from the browser. 

## Project structure

```text
ai-personalization/
├── chroma_db
├── src
│   ├── auth/
│   │   ├── client_auth.py
│   │   └── token_utils.py
│   ├── middleware/
│   │   ├── audit_logger.py
│   │   ├── auth_middleware.py
│   │   └── rate_limiter.py
│   ├── routes/
│   │   ├── public_auth_routes.py
│   │   └── public_chat_routes.py
│   ├── scripts/
│   │   └── create_client.py
│   ├── uploads/
│   ├── app.py
│   ├── lesson_planner_routes.py
│   ├── ragflow_client.py
│   ├── ragflow_routes.py
│   ├── resource_registry.py
│   └── supabase_client.py
├── Dockerfile
└── requirements.txt
```

## How it fits in the stack

The usual request flow is: frontend -> backend API -> AI Personalization service -> Supabase and RAGFlow. The backend API already forwards `/api/public` requests to `process.env.AI_SERVICE_URL`, defaulting to `http://localhost:5001`, so keeping this service on port `5001` matches the existing integration pattern.

## Run options

### Option 1: Docker Compose from repo root

This is the normal way to start the full stack. From the repository root, run:

```bash
docker compose up --build
```

If your root `docker-compose.yml` already wires this service into the platform, that is enough; once the containers are healthy, open the usual application URL exposed by the stack. The backend API expects this AI service to be reachable through `AI_SERVICE_URL`, with `http://localhost:5001` used as the local default in the surrounding backend code.

### Option 2: Run locally with Python

For local development of only this service, go into `src/` and start it directly:

```bash
cd ai-personalization/src
python app.py
```

Keep the service on port `5001` so the backend proxy continues to work without extra config, because the main backend already targets `http://localhost:5001` by default for the AI layer.

## Local setup

### 1. Create a virtual environment

```bash
cd ai-personalization
python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file for the service. The exact variable names may vary slightly depending on your current Python implementation, but the service should at minimum define Supabase connectivity, JWT/auth settings, and RAGFlow/base URL settings to match the rest of the platform.

A practical `.env` template:

```env
PORT=5001
HOST=0.0.0.0

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

JWT_SECRET=your_jwt_secret

RAGFLOW_BASE_URL=your_ragflow_base_url
RAGFLOW_API_KEY=your_ragflow_api_key

UPLOAD_DIR=src/uploads
CHROMA_DB_DIR=chroma_db
LOG_LEVEL=INFO
```

### 4. Start the service

```bash
cd src
python app.py
```

## Docker deployment

The repository already contains a `Dockerfile`, so the README should support a container-first workflow. For consistency with the rest of the stack, build the image from the `ai-personalization/` directory and expose port `5001`, because the backend API is written to call the AI service at that port by default.

### Build image

```bash
docker build -t ai-personalization:latest .
```

### Run container directly

```bash
docker run --name ai-personalization \
  -p 5001:5001 \
  --env-file .env \
  -v $(pwd)/chroma_db:/app/chroma_db \
  -v $(pwd)/src/uploads:/app/src/uploads \
  ai-personalization:latest
```

### Recommended Compose service

A typical Compose service definition for production-like local use:

```yaml
services:
  ai-personalization:
    build:
      context: ./ai-personalization
      dockerfile: Dockerfile
    container_name: ai-personalization
    restart: unless-stopped
    env_file:
      - ./ai-personalization/.env
    ports:
      - "5001:5001"
    volumes:
      - ./ai-personalization/chroma_db:/app/chroma_db
      - ./ai-personalization/src/uploads:/app/src/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
```

If your root compose file also runs the Node backend, point the backend's `AI_SERVICE_URL` to `http://ai-personalization:5001` inside Docker networking instead of `localhost`, because service-to-service traffic inside Compose should use the Compose service name.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | Yes | Port for the Python service, recommended `5001`. |
| `HOST` | Recommended | Bind host, usually `0.0.0.0` in Docker. |
| `SUPABASE_URL` | Yes | Supabase project URL used by the service. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key for secure server-side database access. |
| `JWT_SECRET` | Yes | Secret used for signing or verifying JWTs. Keep aligned with the platform auth flow where required. |
| `RAGFLOW_BASE_URL` | Usually | Base URL for RAGFlow or the RAG gateway. |
| `RAGFLOW_API_KEY` | Usually | API key for RAGFlow requests if your deployment requires it. |
| `UPLOAD_DIR` | Recommended | Directory for uploaded files, usually `src/uploads`. |
| `CHROMA_DB_DIR` | If used | Persistent directory for local Chroma storage. |
| `LOG_LEVEL` | Optional | Logging level such as `INFO` or `DEBUG`. |

## Expected behavior

When started successfully, the service should listen on port `5001` so the rest of the platform can reach it through the existing backend proxy path.In the full platform, browser traffic should usually hit the main backend first, while this service remains an internal application service handling `/api/public` and AI-related logic.

## Main modules

### `src/app.py`
Application entry point. This is the file used when running the service directly with `python app.py`, and it should register routes, middleware, and server startup behavior based on your current workflow.

### `src/routes/public_auth_routes.py`
Contains public authentication routes for clients or public consumers of the AI layer, matching the service's external auth-facing responsibility from the project layout.

### `src/routes/public_chat_routes.py`
Contains public chat endpoints. These are the routes expected to back the public chat experience exposed through the wider backend proxy.

### `src/auth/`
Houses client authentication logic and token helpers. This typically includes validating client credentials, issuing tokens, and parsing or signing JWT-like auth artifacts.

### `src/middleware/`
Contains cross-cutting request logic such as auth enforcement, audit logging, and rate limiting. These pieces are important because the service is exposed behind a public API path and should enforce consistent request controls.

### `src/ragflow_client.py` and `src/ragflow_routes.py`
Integrate the service with RAGFlow-backed retrieval and document/chat operations. This layer should stay aligned with the rest of the platform's AI service expectations.

### `src/supabase_client.py`
Central place for Supabase connection setup. This should only use server-side credentials and must never expose service-role secrets to the frontend.

### `src/lesson_planner_routes.py`
Contains lesson-planner related functionality, likely used as an AI-assisted feature in the broader teacher-facing ecosystem.

### `src/resource_registry.py`
Holds resource lookups or dataset/resource registration logic that supports retrieval, routing, or content selection.

### `src/scripts/create_client.py`
Utility script for creating API clients or seeded auth clients. This is useful during onboarding, staging setup, or production provisioning.

## Development workflow

### Full stack

Use this when testing the integrated platform:

```bash
# from repo root
docker compose up --build
```

### AI service only

Use this when iterating on the Python service:

```bash
cd ai-personalization
source .venv/bin/activate
cd src
python app.py
```

### Suggested dev checks

```bash
pip install -r requirements.txt
python app.py
```

If the rest of the stack is already running, verify that the main backend can still proxy requests to this service on port `5001`, because that is the integration path already defined in the backend codebase.

## Production notes

- Run the service behind Docker with `restart: unless-stopped` or an equivalent policy for resilience.
- Mount `chroma_db` and `src/uploads` as volumes if they contain data that must survive container restarts.
- Store secrets only through environment variables or secret managers, never in the image.
- Keep the service bound to `0.0.0.0` inside containers and expose only the required port.
- If deployed together with the backend in Compose, use the internal Docker service name for `AI_SERVICE_URL` instead of `localhost`.
- Add a `/health` endpoint if not already present, because it makes Compose, reverse proxies, and cloud deployments much cleaner.

## Security notes

This service should be treated as a backend-only service and must use server-side Supabase credentials, not browser-safe anon keys, for any privileged operations. The surrounding platform already separates frontend and backend responsibilities, and the backend proxy pattern indicates this service is intended to live behind trusted server infrastructure rather than direct public browser access.

Recommended practices:

- Rotate `JWT_SECRET`, Supabase service-role keys, and RAGFlow keys regularly.
- Rate-limit public chat and auth routes.
- Audit-log sensitive actions.
- Validate uploaded file types and size limits.
- Avoid logging raw tokens, secrets, or full user payloads.
- Keep CORS restrictive if the service is ever exposed directly.

## Troubleshooting

### Backend cannot reach the AI service

Check that the service is actually running on port `5001` and that the backend `AI_SERVICE_URL` points to the correct host. In Docker Compose, prefer `http://ai-personalization:5001`; outside Docker, use `http://localhost:5001`.

### App starts locally but not in Docker

Usually this means one of three things: the app is binding only to `127.0.0.1`, required env vars are missing, or a mounted path such as `chroma_db` or `src/uploads` is incorrect. Set `HOST=0.0.0.0`, confirm `.env` loading, and verify the mounted directories exist.

### Supabase errors

Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present and valid. Because this is a server-side service, using the wrong key type is a common cause of auth or permission failures.

### Proxy works locally but fails in Compose

That usually means the backend still points at `localhost`. Inside Docker networking, the backend must call the AI container by Compose service name rather than the host loopback address.

## Quick start

```bash
# full stack
cd <repo-root>
docker compose up --build

# service only
cd ai-personalization
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd src
python app.py
```