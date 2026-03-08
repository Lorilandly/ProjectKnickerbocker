use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::{is_server_admin, require_hall_admin, require_hall_member, AppState, AuthUser};
use crate::models::{
    AssignUserRequest, CreateChipRecordRequest, CreateHallRequest, Hall, HallInvite,
    HallMemberWithUser, InviteUserRequest, LeaderboardEntry, PromoteUserRequest,
};

pub async fn list_halls(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
) -> Result<Json<Vec<Hall>>, (StatusCode, &'static str)> {
    let halls: Vec<Hall> = if is_server_admin(&state, &user.email) {
        sqlx::query_as("SELECT * FROM halls ORDER BY created_at DESC")
            .fetch_all(&state.db)
            .await
    } else {
        sqlx::query_as(
            "SELECT h.* FROM halls h
             JOIN hall_members hm ON h.id = hm.hall_id
             WHERE hm.user_id = ?
             ORDER BY h.created_at DESC",
        )
        .bind(user.id)
        .fetch_all(&state.db)
        .await
    }
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(halls))
}

pub async fn create_hall(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Json(req): Json<CreateHallRequest>,
) -> Result<(StatusCode, Json<Hall>), (StatusCode, &'static str)> {
    if !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Server admin required"));
    }

    let id = sqlx::query(
        "INSERT INTO halls (name, description, created_by_user_id) VALUES (?, ?, ?)",
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(user.id)
    .execute(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .last_insert_rowid();

    let hall: Hall = sqlx::query_as("SELECT * FROM halls WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    // Creator is hall admin
    sqlx::query(
        "INSERT INTO hall_members (hall_id, user_id, role) VALUES (?, ?, 'admin')",
    )
    .bind(id)
    .bind(user.id)
    .execute(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok((StatusCode::CREATED, Json(hall)))
}

pub async fn get_hall(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Hall>, (StatusCode, &'static str)> {
    let is_admin = is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    let hall: Hall = sqlx::query_as("SELECT * FROM halls WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Hall not found"))?;

    Ok(Json(hall))
}

pub async fn list_members(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Vec<HallMemberWithUser>>, (StatusCode, &'static str)> {
    let is_admin = is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        id: i64,
        hall_id: i64,
        user_id: i64,
        role: String,
        points: f64,
        joined_at: chrono::DateTime<chrono::Utc>,
        user_name: String,
        user_email: String,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT hm.id, hm.hall_id, hm.user_id, hm.role, hm.points, hm.joined_at,
                u.name as user_name, u.email as user_email
         FROM hall_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.hall_id = ?
         ORDER BY hm.points DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result = rows
        .into_iter()
        .map(|r| HallMemberWithUser {
            id: r.id,
            hall_id: r.hall_id,
            user_id: r.user_id,
            role: r.role,
            points: r.points,
            joined_at: r.joined_at,
            user_name: r.user_name,
            user_email: r.user_email,
        })
        .collect();

    Ok(Json(result))
}

pub async fn leaderboard(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Vec<LeaderboardEntry>>, (StatusCode, &'static str)> {
    let is_admin = is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        user_id: i64,
        name: String,
        points: f64,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT hm.user_id, u.name, hm.points
         FROM hall_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.hall_id = ?
         ORDER BY hm.points DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result = rows
        .into_iter()
        .map(|r| LeaderboardEntry {
            user_id: r.user_id,
            name: r.name,
            points: r.points,
        })
        .collect();

    Ok(Json(result))
}

pub async fn assign_user(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<AssignUserRequest>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    if !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Server admin required"));
    }

    let hall_exists: Option<(i64,)> = sqlx::query_as("SELECT 1 FROM halls WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if hall_exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Hall not found"));
    }

    sqlx::query(
        "INSERT OR IGNORE INTO hall_members (hall_id, user_id, role) VALUES (?, ?, 'member')",
    )
    .bind(id)
    .bind(req.user_id)
    .execute(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn invite_user(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<InviteUserRequest>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let is_admin = require_hall_admin(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    // Preserve the existing invite row (id/created_at) instead of REPLACE.
    sqlx::query(
        "INSERT INTO hall_invites (hall_id, user_id, invited_by_user_id, status)
         VALUES (?, ?, ?, 'pending')
         ON CONFLICT(hall_id, user_id) DO UPDATE SET
           invited_by_user_id = excluded.invited_by_user_id,
           status = 'pending'",
    )
    .bind(id)
    .bind(req.user_id)
    .bind(user.id)
    .execute(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn promote_user(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<PromoteUserRequest>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let is_admin = require_hall_admin(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let result = sqlx::query("UPDATE hall_members SET role = 'admin' WHERE hall_id = ? AND user_id = ?")
        .bind(id)
        .bind(req.user_id)
        .execute(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "User is not a hall member"));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_invites(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Vec<HallInvite>>, (StatusCode, &'static str)> {
    let is_admin = require_hall_admin(&state.db, id, user.id).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let invites: Vec<HallInvite> = sqlx::query_as(
        "SELECT * FROM hall_invites WHERE hall_id = ? AND status = 'pending'",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(Json(invites))
}

pub async fn create_chip_record(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(req): Json<CreateChipRecordRequest>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let is_admin = require_hall_admin(&state.db, id, user.id)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_server_admin(&state, &user.email) {
        return Err((StatusCode::FORBIDDEN, "Hall admin required"));
    }

    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    sqlx::query(
        "INSERT INTO hall_chip_records (hall_id, user_id, amount, recorded_by_user_id, note)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(req.user_id)
    .bind(req.amount)
    .bind(user.id)
    .bind(&req.note)
    .execute(&mut *tx)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let affected = sqlx::query(
        "UPDATE hall_members SET points = points + ? WHERE hall_id = ? AND user_id = ?",
    )
    .bind(req.amount)
    .bind(id)
    .bind(req.user_id)
    .execute(&mut *tx)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
    .rows_affected();

    if affected == 0 {
        return Err((StatusCode::BAD_REQUEST, "Target user is not a hall member"));
    }

    tx.commit()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_records(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, &'static str)> {
    let is_admin = is_server_admin(&state, &user.email);
    let is_member = require_hall_member(&state.db, id, user.id)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    if !is_admin && !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this hall"));
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        game_id: i64,
        game_name: String,
        played_at: chrono::DateTime<chrono::Utc>,
        point_conversion_rate: f64,
        user_id: i64,
        user_name: String,
        points: f64,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT g.id as game_id, g.name as game_name, g.played_at, g.point_conversion_rate,
                gr.user_id, u.name as user_name, gr.points
         FROM games g
         JOIN game_results gr ON gr.game_id = g.id
         JOIN users u ON u.id = gr.user_id
         WHERE g.hall_id = ?
         ORDER BY g.played_at DESC, g.id DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let payload = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "game_id": r.game_id,
                "game_name": r.game_name,
                "played_at": r.played_at,
                "point_conversion_rate": r.point_conversion_rate,
                "user_id": r.user_id,
                "user_name": r.user_name,
                "points": r.points
            })
        })
        .collect();

    Ok(Json(payload))
}
