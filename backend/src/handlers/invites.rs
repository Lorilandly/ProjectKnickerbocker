use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::auth::AppState;
use crate::auth::AuthUser;
use crate::models::{HallInvite, InviteWithHallName};

pub async fn my_invites(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
) -> Result<Json<Vec<InviteWithHallName>>, (StatusCode, &'static str)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i64,
        hall_id: i64,
        user_id: i64,
        invited_by_user_id: i64,
        status: String,
        created_at: chrono::DateTime<chrono::Utc>,
        hall_name: String,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT hi.id, hi.hall_id, hi.user_id, hi.invited_by_user_id, hi.status, hi.created_at, h.name as hall_name
         FROM hall_invites hi
         JOIN halls h ON hi.hall_id = h.id
         WHERE hi.user_id = ? AND hi.status = 'pending'",
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result = rows
        .into_iter()
        .map(|r| InviteWithHallName {
            id: r.id,
            hall_id: r.hall_id,
            user_id: r.user_id,
            invited_by_user_id: r.invited_by_user_id,
            status: r.status,
            created_at: r.created_at,
            hall_name: r.hall_name,
        })
        .collect();

    Ok(Json(result))
}

pub async fn accept_invite(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(invite_id): Path<i64>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let invite: HallInvite = sqlx::query_as("SELECT * FROM hall_invites WHERE id = ?")
        .bind(invite_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Invite not found"))?;

    if invite.user_id != user.id {
        return Err((StatusCode::FORBIDDEN, "Not your invite"));
    }

    if invite.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "Invite already responded"));
    }

    let mut tx = state.db.begin().await.map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "DB error")
    })?;

    sqlx::query(
        "INSERT OR IGNORE INTO hall_members (hall_id, user_id, role) VALUES (?, ?, 'member')",
    )
    .bind(invite.hall_id)
    .bind(user.id)
    .execute(&mut *tx)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    sqlx::query("UPDATE hall_invites SET status = 'accepted' WHERE id = ?")
        .bind(invite_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    tx.commit().await.map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "DB error")
    })?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn decline_invite(
    State(state): State<Arc<AppState>>,
    AuthUser(user): AuthUser,
    Path(invite_id): Path<i64>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let invite: HallInvite = sqlx::query_as("SELECT * FROM hall_invites WHERE id = ?")
        .bind(invite_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?
        .ok_or((StatusCode::NOT_FOUND, "Invite not found"))?;

    if invite.user_id != user.id {
        return Err((StatusCode::FORBIDDEN, "Not your invite"));
    }

    if invite.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "Invite already responded"));
    }

    sqlx::query("UPDATE hall_invites SET status = 'declined' WHERE id = ?")
        .bind(invite_id)
        .execute(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    Ok(StatusCode::NO_CONTENT)
}
