# Chunga Gava

A geo-fenced (Kenya) civic transparency & accountability platform: policy Q&A over official documents
(RAG), an interactive map to scrutinize Governors/MCAs and rate public services, SMS Q&A, and an admin
CMS for knowledge base, map data, and automated report dispatch.

## Architecture (full)

- **Frontend** (`frontend/`): Next.js (App Router) + TailwindCSS + `@react-google-maps/api`.
- **Backend** (`backend/`): FastAPI, SQLAlchemy, GeoAlchemy2 (PostGIS), `pgvector`, OpenAI (RAG + summaries).
- **Database**: PostgreSQL with `postgis` + `vector` extensions, built from `postgres/Dockerfile`
  (`pgvector/pgvector:pg16` base + the PGDG `postgis` packages, since the upstream pgvector image does
  not bundle PostGIS).
- **Object storage**: MinIO (S3-compatible) for manifesto photos, rating evidence, uploaded PDFs.
- **SMS**: Africa's Talking (webhook `/api/sms/incoming`, alias `/api/sms-receive`, + outbound SMS API).
  Supports multilingual AI intent parsing (query vs. rate) with multi-turn disambiguation via a
  short-lived in-memory session keyed by sender phone number.
- **Scheduling**: APScheduler background job dispatches AI-generated feedback summaries to officials by
  email/SMS according to the admin-configured frequency (daily/weekly/monthly/quarterly).

## Local development (Docker Compose)

```bash
cp .env.example .env
cp backend/.env.example backend/.env
# Fill in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env, and OPENAI_API_KEY/AT_API_KEY in backend/.env.
# Generate ADMIN_PASSWORD_HASH:
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -e . \
  && python -m app.core.security hash '<your-admin-password>'
# paste the resulting hash into backend/.env as ADMIN_PASSWORD_HASH

cd ..
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- MinIO console: http://localhost:9001

Sign in to `/admin` with `ADMIN_USERNAME` / the plaintext password you hashed above.

`NEXT_PUBLIC_*` variables are baked into the frontend's JS bundle at build time. If you change
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` after the first build, re-run
`docker compose up --build frontend` (a plain restart won't pick it up).

## Running the backend without Docker

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

Requires a reachable Postgres instance with the `postgis` and `vector` extensions enabled (see
`app/db/init_db.sql`) and, optionally, a MinIO/S3-compatible endpoint for file uploads.

## Running the frontend without Docker

```bash
cd frontend
npm install
npm run dev
```

## Kubernetes (Minikube / Docker Desktop)

```bash
# Build local images referenced by the manifests
docker build -f postgres/Dockerfile -t chungagava-postgres:local .
docker build -t chungagava-backend:local ./backend
# NEXT_PUBLIC_* vars are baked into the client bundle at build time, so they must be
# passed as --build-arg here (setting them on the Deployment/pod has no effect):
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://192.168.49.2:30800 \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key> \
  -t chungagava-frontend:local ./frontend
# If using Minikube, load images into its runtime instead of a registry:
minikube image load chungagava-postgres:local
minikube image load chungagava-backend:local
minikube image load chungagava-frontend:local

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml   # edit placeholder values first!
kubectl apply -f k8s/postgres-deployment.yaml -f k8s/postgres-service.yaml
kubectl apply -f k8s/minio-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml -f k8s/frontend-service.yaml
```

With the `docker` driver on Linux, Minikube's NodePorts are reachable at the node IP (`minikube ip`,
e.g. `192.168.49.2`), not `localhost` — use `minikube service frontend -n chungagava --url` to get a
clickable URL, or run `minikube tunnel` in a separate terminal.

Frontend: `http://<minikube ip>:30300` (NodePort). Backend: `http://<minikube ip>:30800` (NodePort).

The Compose and Kubernetes manifests pin the legacy community MinIO image to
`RELEASE.2025-09-07T16-13-09Z`. The newer `quay.io/minio/aistor/minio` image requires an AIStor
license before it permits S3 operations, so it is not a drop-in replacement for this local setup.

`k8s/secret.yaml` is a **template** — replace placeholder values (or, better, create the Secret directly
with `kubectl create secret generic chungagava-secrets --from-literal=...`) and never commit real
credentials.

## Feature map

| Feature | Where |
| --- | --- |
| "Country: Kenya" indicator | `frontend/app/admin/page.tsx` |
| Knowledge base upload + PDF → embeddings | `backend/app/routers/knowledge_base.py`, `services/embeddings.py` |
| Governors/MCAs + Amenities CMS | `backend/app/routers/officials.py`, `routers/amenities.py` |
| Report dispatch frequency config | `Official.report_frequency`, `OfficialsManager.tsx` |
| Web policy Q&A with citations | `backend/app/services/rag.py`, `frontend/app/chat/page.tsx` |
| SMS Q&A webhook | `backend/app/routers/sms.py` |
| Kenya-bounded map, zoom-based Governor/MCA layers | `frontend/components/MapView.tsx` |
| Manifesto modal + rating engine (once per cycle) | `ManifestoModal.tsx`, `routers/ratings.py` |
| AI summary + dispatch cron | `backend/app/services/scheduler.py` |
| Services layer + Street View + AI amenity summary | `MapView.tsx`, `AmenityModal.tsx`, `routers/amenities.py` |
| Kubernetes manifests | `k8s/` |

## Notes & limitations

- Admin auth is a single configured account (JWT) rather than full user management — sufficient for a
  single-tenant CMS; extend with a proper `AdminUser` table if multiple admins are needed.
- Citizen votes/ratings use an anonymous per-browser identifier (`localStorage` UUID) rather than
  full citizen accounts, enforced server-side with a unique `(target, voter, cycle)` constraint.
- `SMS_PROVIDER`/email send functions log to console instead of sending when credentials are unset, so
  the full flow can be exercised locally without live third-party accounts.
