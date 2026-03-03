use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::{require_hall_admin, require_hall_member, AppState, AuthUser};
use crate::models::{CreateGameRequest, Game, UpdateGameRequest};

pub async fn list_games(
    State(state): State<std::sync::Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(hall_id): Path<i64>,
) -> Result<Json<Vec<Game>>, (StatusCode, &'static str)> {
    let is_admin = crate::auth::is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, hall_id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    let games: Vec<Game> = sqlx::query_as("SELECT * FROM games WHERE hall_id = ? ORDER BY created_at")
        .bind(hall_id)
        .fetch_all(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(games))
}

pub async fn create_game(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(hall_id): Path<i64>,
    Json(req): Json<CreateGameRequest>,
) -> Result<(StatusCode, Json<Game>), (StatusCode, &'static str)> {
    let is_admin = require_hall_admin(&state.db, hall_id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !crate::auth::is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let id = sqlx::query(
        "INSERT INTO games (hall_id, name, description, point_conversion_rate, expected_sum_rule)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(hall_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.point_conversion_rate)
    .bind(&req.expected_sum_rule)
    .execute(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .last_insert_rowid();

    let game: Game = sqlx::query_as("SELECT * FROM games WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok((StatusCode::CREATED, Json(game)))
}

pub async fn get_game(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Game>, (StatusCode, &'static str)> {
    let game: Game = sqlx::query_as("SELECT * FROM games WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Game not found"))?;

    let is_admin = crate::auth::is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, game.hall_id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    Ok(Json(game))
}

pub async fn update_game(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<UpdateGameRequest>,
) -> Result<Json<Game>, (StatusCode, &'static str)> {
    let game: Game = sqlx::query_as("SELECT * FROM games WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Game not found"))?;

    let is_admin = require_hall_admin(&state.db, game.hall_id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !crate::auth::is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    if let Some(name) = req.name {
        sqlx::query("UPDATE games SET name = ? WHERE id = ?")
            .bind(name)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }
    if req.description.is_some() {
        sqlx::query("UPDATE games SET description = ? WHERE id = ?")
            .bind(&req.description)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }
    if let Some(rate) = req.point_conversion_rate {
        sqlx::query("UPDATE games SET point_conversion_rate = ? WHERE id = ?")
            .bind(rate)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }
    if req.expected_sum_rule.is_some() {
        sqlx::query("UPDATE games SET expected_sum_rule = ? WHERE id = ?")
            .bind(&req.expected_sum_rule)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }

    let game: Game = sqlx::query_as("SELECT * FROM games WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(game))
}
