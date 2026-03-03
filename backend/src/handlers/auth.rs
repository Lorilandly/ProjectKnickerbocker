use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    Json,
};
use oauth2::{
    basic::BasicClient, AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken,
    PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, TokenUrl,
};
use oauth2::TokenResponse;
use serde::Deserialize;
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::{AppState, AuthUser};
use crate::models::User;

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

pub async fn me(AuthUser(user): AuthUser) -> impl IntoResponse {
    Json(serde_json::json!({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
    }))
}

pub async fn google_login(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let client = oauth_client(&state);
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    let (auth_url, csrf_state) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("openid".into()))
        .add_scope(Scope::new("email".into()))
        .add_scope(Scope::new("profile".into()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    let state_secret = csrf_state.secret();
    state
        .pkce_store
        .lock()
        .unwrap()
        .insert(state_secret.clone(), pkce_verifier.secret().to_string());

    Redirect::temporary(auth_url.as_str())
}

pub async fn google_callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CallbackQuery>,
) -> impl IntoResponse {
    if let Some(err) = params.error {
        tracing::warn!("OAuth error: {}", err);
        return Redirect::temporary("/?auth_error=1").into_response();
    }

    let code = match params.code {
        Some(c) => c,
        None => return Redirect::temporary("/?auth_error=2").into_response(),
    };

    let csrf_state = match &params.state {
        Some(s) => s.clone(),
        None => return Redirect::temporary("/?auth_error=2").into_response(),
    };

    let pkce_verifier = state
        .pkce_store
        .lock()
        .unwrap()
        .remove(&csrf_state)
        .map(PkceCodeVerifier::new);

    let pkce_verifier = match pkce_verifier {
        Some(v) => v,
        None => return Redirect::temporary("/?auth_error=2").into_response(),
    };

    let client = oauth_client(&state);
    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(pkce_verifier)
        .request_async(oauth2::reqwest::async_http_client)
        .await;

    let token_response = match token_result {
        Ok(t) => t,
        Err(e) => {
            tracing::warn!("Token exchange failed: {:?}", e);
            return Redirect::temporary("/?auth_error=3").into_response();
        }
    };

    let access_token = token_response.access_token().secret().to_owned();
    let claims = match fetch_google_userinfo(&access_token).await {
        Ok(c) => c,
        Err(_) => return Redirect::temporary("/?auth_error=5").into_response(),
    };

    let user = upsert_user(
        &state.db,
        &claims.sub,
        &claims.email,
        &claims.name,
        claims.picture.as_deref(),
    )
    .await;

    let user = match user {
        Ok(u) => u,
        Err(_) => return Redirect::temporary("/?auth_error=6").into_response(),
    };

    let session_token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(7);

    let session_insert = sqlx::query(
        "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
    )
    .bind(user.id)
    .bind(&session_token)
    .bind(expires_at)
    .execute(&state.db)
    .await;

    if session_insert.is_err() {
        return Redirect::temporary("/?auth_error=7").into_response();
    }

    // Redirect to frontend with token in fragment (SPA pattern)
    Redirect::temporary(&format!("/#token={}", session_token)).into_response()
}

pub async fn logout(
    AuthUser(user): AuthUser,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let _ = sqlx::query("DELETE FROM auth_sessions WHERE user_id = ?")
        .bind(user.id)
        .execute(&state.db)
        .await;
    Json(serde_json::json!({ "ok": true }))
}

fn oauth_client(state: &AppState) -> BasicClient {
    let redirect_url = std::env::var("AUTH_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8080/api/auth/callback".into());

    BasicClient::new(
        ClientId::new(state.google_client_id.clone()),
        Some(ClientSecret::new(state.google_client_secret.clone())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(redirect_url).unwrap())
}

#[derive(serde::Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: String,
    name: String,
    picture: Option<String>,
}

async fn fetch_google_userinfo(token: &str) -> Result<GoogleUserInfo, reqwest::Error> {
    let client = reqwest::Client::new();
    client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(token)
        .send()
        .await?
        .error_for_status()?
        .json::<GoogleUserInfo>()
        .await
}

async fn upsert_user(
    pool: &SqlitePool,
    google_id: &str,
    email: &str,
    name: &str,
    avatar_url: Option<&str>,
) -> Result<User, sqlx::Error> {
    let existing: Option<User> = sqlx::query_as("SELECT * FROM users WHERE google_id = ?")
        .bind(google_id)
        .fetch_optional(pool)
        .await?;

    if let Some(u) = existing {
        let _ = sqlx::query("UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?")
            .bind(email)
            .bind(name)
            .bind(avatar_url)
            .bind(u.id)
            .execute(pool)
            .await?;
        let user: User = sqlx::query_as("SELECT * FROM users WHERE id = ?")
            .bind(u.id)
            .fetch_one(pool)
            .await?;
        return Ok(user);
    }

    let id = sqlx::query(
        "INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)",
    )
    .bind(google_id)
    .bind(email)
    .bind(name)
    .bind(avatar_url)
    .execute(pool)
    .await?
    .last_insert_rowid();

    let user: User = sqlx::query_as("SELECT * FROM users WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    Ok(user)
}
