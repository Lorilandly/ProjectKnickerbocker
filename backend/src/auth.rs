use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts, StatusCode},
};
use sqlx::SqlitePool;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::db::DbPool;
use crate::models::User;

use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub session_secret: String,
    pub google_client_id: String,
    pub google_client_secret: String,
    pub server_admin_emails: Vec<String>,
    pub pkce_store: Arc<Mutex<HashMap<String, String>>>,
}

pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
}

/// Extractor for authenticated user. Returns 401 if not logged in.
#[derive(Clone)]
pub struct AuthUser(pub User);

#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let state = Arc::<AppState>::from_ref(state);
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .map(|s| s.to_owned());

        let token = auth_header.ok_or((StatusCode::UNAUTHORIZED, "Missing authorization"))?;
        let user = validate_session(&state.db, &token)
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid or expired session"))?
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid or expired session"))?;
        Ok(AuthUser(user))
    }
}

pub async fn validate_session(pool: &SqlitePool, token: &str) -> Result<Option<User>, sqlx::Error> {
    let now = chrono::Utc::now();
    let row: Option<(i64,)> = sqlx::query_as(
        "SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?",
    )
    .bind(token)
    .bind(now)
    .fetch_optional(pool)
    .await?;

    let user_id = match row {
        Some((id,)) => id,
        None => return Ok(None),
    };

    let user: User = sqlx::query_as("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    Ok(Some(user))
}

pub fn is_server_admin(state: &AppState, email: &str) -> bool {
    state
        .server_admin_emails
        .iter()
        .any(|e| e.eq_ignore_ascii_case(email))
}

pub async fn require_hall_admin(
    pool: &SqlitePool,
    hall_id: i64,
    user_id: i64,
) -> Result<bool, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT role FROM hall_members WHERE hall_id = ? AND user_id = ?",
    )
    .bind(hall_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|(r,)| r == "admin").unwrap_or(false))
}

pub async fn require_hall_member(
    pool: &SqlitePool,
    hall_id: i64,
    user_id: i64,
) -> Result<bool, sqlx::Error> {
    let row: Option<(i64,)> = sqlx::query_as(
        "SELECT 1 FROM hall_members WHERE hall_id = ? AND user_id = ?",
    )
    .bind(hall_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}
