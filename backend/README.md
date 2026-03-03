# Score Tracker Backend

Rust backend for the Gaming Score Tracker (Project Knickerbocker). Built with Axum, SQLite, and Google OAuth.

## Prerequisites

- Rust (stable)
- SQLite

## Setup

1. Create Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/):
   - Create OAuth 2.0 Client ID (Web application)
   - Add redirect URI: `http://localhost:8080/api/auth/callback`

2. Set environment variables:

```bash
export DATABASE_URL="sqlite:./data/score_tracker.db"
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export SESSION_SECRET="random-secret-for-sessions"
export SERVER_ADMIN_EMAILS="admin@example.com,other@example.com"
export AUTH_REDIRECT_URL="http://localhost:8080/api/auth/callback"
```

3. Create data directory and run:

```bash
mkdir -p data
cargo run
```

## API Endpoints

| Method | Path | Description |
|--------|------|------|
| GET | /api/auth/google | Start Google OAuth |
| GET | /api/auth/callback | OAuth callback |
| GET | /api/auth/me | Current user (auth) |
| POST | /api/auth/logout | Logout (auth) |
| GET | /api/halls | List halls |
| POST | /api/halls | Create hall (server admin) |
| GET | /api/halls/:id | Get hall |
| GET | /api/halls/:id/members | List members |
| GET | /api/halls/:id/leaderboard | Leaderboard |
| POST | /api/halls/:id/assign | Assign user (server admin) |
| POST | /api/halls/:id/invite | Invite user |
| POST | /api/halls/:id/promote | Promote to admin |
| GET | /api/halls/:id/invites | List invites |
| GET | /api/halls/:id/games | List games |
| POST | /api/halls/:id/games | Create game |
| GET | /api/halls/:id/stats | Hall stats |
| GET | /api/games/:id | Get game |
| PUT | /api/games/:id | Update game |
| GET | /api/games/:id/sessions | List sessions |
| POST | /api/games/:id/sessions | Create session |
| GET | /api/sessions/:id | Get session |
| POST | /api/sessions/:id/results | Add results |
| POST | /api/sessions/:id/finalize | Finalize session |
| GET | /api/invites/me | My pending invites |
| POST | /api/invites/:id/accept | Accept invite |
| POST | /api/invites/:id/decline | Decline invite |
| GET | /api/users/me/history | My history |
| GET | /api/users/me/stats | My stats |

**Auth**: All endpoints except `/api/auth/google` and `/api/auth/callback` require `Authorization: Bearer <session_token>`.

## First Build

sqlx verifies queries at compile time. Create the DB and run migrations first:

```bash
mkdir -p data
DATABASE_URL="sqlite:./data/score_tracker.db" cargo sqlx database create
DATABASE_URL="sqlite:./data/score_tracker.db" cargo sqlx migrate run
cargo build
```
