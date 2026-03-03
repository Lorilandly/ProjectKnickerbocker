use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use std::sync::Arc;

use crate::auth::{is_server_admin, require_hall_member, AppState, AuthUser};

#[derive(Serialize)]
pub struct HallStats {
    pub leaderboard: Vec<LeaderboardEntry>,
    pub recent_sessions: Vec<RecentSession>,
    pub points_by_game: Vec<PointsByGame>,
}

#[derive(Serialize)]
pub struct LeaderboardEntry {
    pub user_id: i64,
    pub name: String,
    pub points: f64,
}

#[derive(Serialize)]
pub struct RecentSession {
    pub id: i64,
    pub game_name: String,
    pub session_name: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct PointsByGame {
    pub game_id: i64,
    pub game_name: String,
    pub total_points: f64,
}

#[derive(Serialize)]
pub struct UserHistoryEntry {
    pub session_id: i64,
    pub game_name: String,
    pub hall_name: String,
    pub points: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct UserStats {
    pub total_points: f64,
    pub halls: Vec<UserHallStats>,
}

#[derive(Serialize)]
pub struct UserHallStats {
    pub hall_id: i64,
    pub hall_name: String,
    pub points: f64,
}

pub async fn hall_stats(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<HallStats>, (StatusCode, &'static str)> {
    let is_admin = is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    #[derive(sqlx::FromRow)]
    struct LeaderRow {
        user_id: i64,
        name: String,
        points: f64,
    }

    let leaderboard: Vec<LeaderboardEntry> = sqlx::query_as(
        "SELECT hm.user_id, u.name, hm.points
         FROM hall_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.hall_id = ?
         ORDER BY hm.points DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .into_iter()
    .map(|r: LeaderRow| LeaderboardEntry {
        user_id: r.user_id,
        name: r.name,
        points: r.points,
    })
    .collect();

    #[derive(sqlx::FromRow)]
    struct SessionRow {
        id: i64,
        game_name: String,
        session_name: Option<String>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let recent_sessions: Vec<RecentSession> = sqlx::query_as(
        "SELECT gs.id, g.name as game_name, gs.name as session_name, gs.finalized_at as created_at
         FROM game_sessions gs
         JOIN games g ON gs.game_id = g.id
         WHERE g.hall_id = ? AND gs.finalized_at IS NOT NULL
         ORDER BY gs.finalized_at DESC
         LIMIT 10",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .into_iter()
    .map(|r: SessionRow| RecentSession {
        id: r.id,
        game_name: r.game_name,
        session_name: r.session_name,
        created_at: r.created_at,
    })
    .collect();

    #[derive(sqlx::FromRow)]
    struct GameRow {
        game_id: i64,
        game_name: String,
        total_points: f64,
    }

    let points_by_game: Vec<PointsByGame> = sqlx::query_as(
        "SELECT g.id as game_id, g.name as game_name,
                COALESCE(SUM(sr.points * g.point_conversion_rate), 0) as total_points
         FROM games g
         LEFT JOIN game_sessions gs ON gs.game_id = g.id AND gs.finalized_at IS NOT NULL
         LEFT JOIN session_results sr ON sr.session_id = gs.id
         WHERE g.hall_id = ?
         GROUP BY g.id",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .into_iter()
    .map(|r: GameRow| PointsByGame {
        game_id: r.game_id,
        game_name: r.game_name,
        total_points: r.total_points,
    })
    .collect();

    Ok(Json(HallStats {
        leaderboard,
        recent_sessions,
        points_by_game,
    }))
}

pub async fn my_history(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
) -> Result<Json<Vec<UserHistoryEntry>>, (StatusCode, &'static str)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        session_id: i64,
        game_name: String,
        hall_name: String,
        points: f64,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT gs.id as session_id, g.name as game_name, h.name as hall_name, sr.points, gs.finalized_at as created_at
         FROM session_results sr
         JOIN game_sessions gs ON sr.session_id = gs.id
         JOIN games g ON gs.game_id = g.id
         JOIN halls h ON g.hall_id = h.id
         WHERE sr.user_id = ? AND gs.finalized_at IS NOT NULL
         ORDER BY gs.finalized_at DESC
         LIMIT 50",
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result: Vec<UserHistoryEntry> = rows
        .into_iter()
        .map(|r| UserHistoryEntry {
            session_id: r.session_id,
            game_name: r.game_name,
            hall_name: r.hall_name,
            points: r.points,
            created_at: r.created_at,
        })
        .collect();

    Ok(Json(result))
}

pub async fn my_stats(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
) -> Result<Json<UserStats>, (StatusCode, &'static str)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        hall_id: i64,
        hall_name: String,
        points: f64,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT hm.hall_id, h.name as hall_name, hm.points
         FROM hall_members hm
         JOIN halls h ON hm.hall_id = h.id
         WHERE hm.user_id = ?",
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let total_points: f64 = rows.iter().map(|r| r.points).sum();
    let halls: Vec<UserHallStats> = rows
        .into_iter()
        .map(|r| UserHallStats {
            hall_id: r.hall_id,
            hall_name: r.hall_name,
            points: r.points,
        })
        .collect();

    Ok(Json(UserStats {
        total_points,
        halls,
    }))
}
