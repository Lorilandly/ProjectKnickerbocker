use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::auth::{AppState, AuthUser};
use crate::models::UserSearchResult;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

pub async fn search_users(
    State(state): State<Arc<AppState>>,
    AuthUser(_user): AuthUser,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<UserSearchResult>>, (StatusCode, &'static str)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i64,
        name: String,
        email: String,
        avatar_url: Option<String>,
    }

    let pattern = format!("{}%", params.q);
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id, name, email, avatar_url FROM users
         WHERE name LIKE ? OR email LIKE ?
         ORDER BY name
         LIMIT 20",
    )
    .bind(&pattern)
    .bind(&pattern)
    .fetch_all(&state.db)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "DB error"))?;

    let result = rows
        .into_iter()
        .map(|r| UserSearchResult {
            id: r.id,
            name: r.name,
            email: r.email,
            avatar_url: r.avatar_url,
        })
        .collect();

    Ok(Json(result))
}
