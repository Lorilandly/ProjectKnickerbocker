use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::{is_server_admin, require_hall_admin, require_hall_member, AppState, AuthUser};
use crate::models::{
    AssignUserRequest, CreateHallRequest, Hall, HallMember, HallInvite, InviteUserRequest,
    PromoteUserRequest,
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
        "INSERT INTO halls (name, created_by_user_id) VALUES (?, ?)",
    )
    .bind(&req.name)
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
) -> Result<Json<Vec<(HallMember, String, String)>>, (StatusCode, &'static str)> {
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
        name: String,
        email: String,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT hm.id, hm.hall_id, hm.user_id, hm.role, hm.points, hm.joined_at, u.name, u.email
         FROM hall_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.hall_id = ?
         ORDER BY hm.points DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result: Vec<(HallMember, String, String)> = rows
        .into_iter()
        .map(|r| {
            (
                HallMember {
                    id: r.id,
                    hall_id: r.hall_id,
                    user_id: r.user_id,
                    role: r.role,
                    points: r.points,
                    joined_at: r.joined_at,
                },
                r.name,
                r.email,
            )
        })
        .collect();

    Ok(Json(result))
}

pub async fn leaderboard(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Vec<(i64, String, f64)>>, (StatusCode, &'static str)> {
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

    let result: Vec<(i64, String, f64)> = rows
        .into_iter()
        .map(|r| (r.user_id, r.name, r.points))
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
