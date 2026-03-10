# Project Knickerbocker

A game score tracker with halls, leaderboards, and Google OAuth. Built with a Rust (Axum) backend and a React (Vite + Tailwind) frontend.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Rust, Axum 0.7, SQLite (via SQLx) |
| Auth | Google OAuth 2.0 |

---

## Local Development

**Prerequisites:** Rust (stable ≥ 1.85), Node 22, a Google OAuth client ID/secret.

### 1. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID (Web application).
3. Add `http://localhost:8080/api/auth/callback` as an Authorized Redirect URI.

### 2. Backend

```bash
cd backend
cp .env.example .env   # or create backend/.env manually
# fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET
cargo run
```

The API listens on `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend automatically.

---

## Production Deployment (Docker + Cloudflare Tunnel)

### Architecture

```
Internet (HTTPS)
  → Cloudflare network
    → cloudflared (host daemon)
      → nginx container :80   (serves React SPA, proxies /api)
        → backend container :8080  (Axum API, SQLite)
```

Cloudflare handles TLS termination. All internal traffic is plain HTTP.

### Prerequisites

- Docker and Docker Compose installed on the host.
- A Cloudflare account with a domain and a tunnel created.
- Google OAuth credentials with the production redirect URI registered.

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `SESSION_SECRET` | Any long random string |
| `SERVER_ADMIN_EMAILS` | Comma-separated emails with admin access |
| `AUTH_REDIRECT_URL` | `https://yourdomain.com/api/auth/callback` |

> `AUTH_REDIRECT_URL` must exactly match an Authorized Redirect URI in your Google Cloud Console OAuth client.

### 2. Build and start

```bash
docker compose up -d --build
```

This builds both images and starts:
- `frontend` — nginx serving the React app on port 80, proxying `/api` to the backend.
- `backend` — Axum API on port 8080 (internal only, not exposed to the host).

SQLite data is persisted in the `db_data` Docker volume.

### 3. Cloudflare Tunnel

Run `cloudflared` on the host pointing at the nginx container:

```bash
# One-time: create the tunnel and DNS record
cloudflared tunnel create knickerbocker
cloudflared tunnel route dns knickerbocker yourdomain.com

# Start the tunnel
cloudflared tunnel --url http://localhost:80 run knickerbocker
```

To run cloudflared as a system service so it survives reboots:

```bash
cloudflared service install
```

### Updating

```bash
docker compose pull        # if using pre-built images from Docker Hub
docker compose up -d --build   # or rebuild from source
```

---

## CI / CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push and PR | `cargo check`, `cargo clippy`, `cargo test`, `tsc + vite build`, ESLint |
| `docker.yml` | Push to `master` | Builds and pushes both Docker images to Docker Hub |

Required GitHub repository secrets for `docker.yml`:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security → Access Tokens) |
