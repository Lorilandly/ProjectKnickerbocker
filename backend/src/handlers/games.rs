use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::{require_hall_admin, require_hall_member, AppState, AuthUser};
use crate::models::{CreateGameRequest, Game, UpdateGameRequest};

const GAME_SELECT_COLUMNS: &str =
    "id, hall_id, name, description, point_conversion_rate, played_at, created_at";

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

    let games: Vec<Game> = sqlx::query_as(&format!(
        "SELECT {} FROM games WHERE hall_id = ? ORDER BY created_at",
        GAME_SELECT_COLUMNS
    ))
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

    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let played_at = req.played_at.unwrap_or_else(chrono::Utc::now);
    let id = sqlx::query(
        "INSERT INTO games (hall_id, name, description, point_conversion_rate, played_at)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(hall_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.point_conversion_rate)
    .bind(played_at)
    .execute(&mut *tx)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .last_insert_rowid();

    for result in &req.results {
        sqlx::query("INSERT INTO game_results (game_id, user_id, points) VALUES (?, ?, ?)")
            .bind(id)
            .bind(result.user_id)
            .bind(result.points)
            .execute(&mut *tx)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

        let affected = sqlx::query(
            "UPDATE hall_members SET points = points + ? WHERE hall_id = ? AND user_id = ?",
        )
        .bind(result.points * req.point_conversion_rate)
        .bind(hall_id)
        .bind(result.user_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .rows_affected();

        if affected == 0 {
            return Err((StatusCode::BAD_REQUEST, "Game result contains non-member user"));
        }
    }

    tx.commit()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let game: Game = sqlx::query_as(&format!(
        "SELECT {} FROM games WHERE id = ?",
        GAME_SELECT_COLUMNS
    ))
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
    let game: Game = sqlx::query_as(&format!(
        "SELECT {} FROM games WHERE id = ?",
        GAME_SELECT_COLUMNS
    ))
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
    let game: Game = sqlx::query_as(&format!(
        "SELECT {} FROM games WHERE id = ?",
        GAME_SELECT_COLUMNS
    ))
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
    if let Some(played_at) = req.played_at {
        sqlx::query("UPDATE games SET played_at = ? WHERE id = ?")
            .bind(played_at)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;
    }

    let game: Game = sqlx::query_as(&format!(
        "SELECT {} FROM games WHERE id = ?",
        GAME_SELECT_COLUMNS
    ))
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(game))
}
