use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::{require_hall_admin, require_hall_member, AppState, AuthUser};
use crate::models::{CreateSessionRequest, GameSession, SessionResult, SessionResultsRequest};

pub async fn list_sessions(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(game_id): Path<i64>,
) -> Result<Json<Vec<GameSession>>, (StatusCode, &'static str)> {
    let game: (i64,) = sqlx::query_as("SELECT hall_id FROM games WHERE id = ?")
        .bind(game_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Game not found"))?;

    let is_admin = crate::auth::is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, game.0, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    let sessions: Vec<GameSession> = sqlx::query_as(
        "SELECT * FROM game_sessions WHERE game_id = ? ORDER BY created_at DESC",
    )
    .bind(game_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(sessions))
}

pub async fn create_session(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(game_id): Path<i64>,
    Json(req): Json<CreateSessionRequest>,
) -> Result<(StatusCode, Json<GameSession>), (StatusCode, &'static str)> {
    let game: (i64,) = sqlx::query_as("SELECT hall_id FROM games WHERE id = ?")
        .bind(game_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Game not found"))?;

    let is_admin = require_hall_admin(&state.db, game.0, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !crate::auth::is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let id = sqlx::query("INSERT INTO game_sessions (game_id, name) VALUES (?, ?)")
        .bind(game_id)
        .bind(&req.name)
        .execute(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .last_insert_rowid();

    let session: GameSession = sqlx::query_as("SELECT * FROM game_sessions WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok((StatusCode::CREATED, Json(session)))
}

pub async fn get_session(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<(GameSession, Vec<SessionResult>)>, (StatusCode, &'static str)> {
    let session: GameSession = sqlx::query_as("SELECT * FROM game_sessions WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Session not found"))?;

    let game: (i64,) = sqlx::query_as("SELECT hall_id FROM games WHERE id = ?")
        .bind(session.game_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let is_admin = crate::auth::is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, game.0, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    let results: Vec<SessionResult> = sqlx::query_as(
        "SELECT * FROM session_results WHERE session_id = ?",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json((session, results)))
}

pub async fn add_results(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<SessionResultsRequest>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let session: GameSession = sqlx::query_as("SELECT * FROM game_sessions WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Session not found"))?;

    if session.finalized_at.is_some() {
        return Err((StatusCode::BAD_REQUEST, "Session already finalized"));
    }

    let game: (i64,) = sqlx::query_as("SELECT hall_id FROM games WHERE id = ?")
        .bind(session.game_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let is_admin = require_hall_admin(&state.db, game.0, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !crate::auth::is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    for entry in &req.results {
        sqlx::query(
            "INSERT OR REPLACE INTO session_results (session_id, user_id, points) VALUES (?, ?, ?)",
        )
        .bind(id)
        .bind(entry.user_id)
        .bind(entry.points)
        .execute(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn finalize_session(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let session: GameSession = sqlx::query_as("SELECT * FROM game_sessions WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Session not found"))?;

    if session.finalized_at.is_some() {
        return Err((StatusCode::BAD_REQUEST, "Session already finalized"));
    }

    let game = sqlx::query_as::<_, (i64, f64, Option<String>)>(
        "SELECT hall_id, point_conversion_rate, expected_sum_rule FROM games WHERE id = ?",
    )
    .bind(session.game_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let (hall_id, conversion_rate, expected_sum_rule) = game;

    let is_admin = require_hall_admin(&state.db, hall_id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !crate::auth::is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let results: Vec<(i64, f64)> = sqlx::query_as(
        "SELECT user_id, points FROM session_results WHERE session_id = ?",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if let Some(rule) = expected_sum_rule {
        let sum: f64 = results.iter().map(|(_, p)| p).sum();
        match rule.as_str() {
            "zero" => {
                if (sum - 0.0).abs() > 0.001 {
                    return Err((StatusCode::BAD_REQUEST, "Sum must be zero"));
                }
            }
            "fixed" | "custom" => {
                // Admin-entered expected or custom: skip validation for now (YAGNI)
            }
            _ => {}
        }
    }

    let mut tx = state.db.begin().await.map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "DB error")
    })?;

    for (user_id, points) in results {
        let hall_points = points * conversion_rate;
        let update_result = sqlx::query(
            "UPDATE hall_members SET points = points + ? WHERE hall_id = ? AND user_id = ?",
        )
        .bind(hall_points)
        .bind(hall_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

        if update_result.rows_affected() == 0 {
            return Err((StatusCode::BAD_REQUEST, "Session result contains non-member user"));
        }
    }

    let now = chrono::Utc::now();
    sqlx::query("UPDATE game_sessions SET finalized_at = ? WHERE id = ?")
        .bind(now)
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    tx.commit().await.map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "DB error")
    })?;

    Ok(StatusCode::NO_CONTENT)
}
