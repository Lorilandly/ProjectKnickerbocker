use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AuthSession {
    pub id: i64,
    pub user_id: i64,
    pub token: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct Hall {
    pub id: i64,
    pub name: String,
    pub created_by_user_id: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct HallMember {
    pub id: i64,
    pub hall_id: i64,
    pub user_id: i64,
    pub role: String,
    pub points: f64,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct HallInvite {
    pub id: i64,
    pub hall_id: i64,
    pub user_id: i64,
    pub invited_by_user_id: i64,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct Game {
    pub id: i64,
    pub hall_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub point_conversion_rate: f64,
    pub played_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct GameResult {
    pub id: i64,
    pub game_id: i64,
    pub user_id: i64,
    pub points: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct HallChipRecord {
    pub id: i64,
    pub hall_id: i64,
    pub user_id: i64,
    pub amount: f64,
    pub recorded_by_user_id: i64,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Request/response DTOs

#[derive(Debug, Deserialize)]
pub struct CreateHallRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct InviteUserRequest {
    pub user_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct AssignUserRequest {
    pub user_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct PromoteUserRequest {
    pub user_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateGameRequest {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default = "default_conversion_rate")]
    pub point_conversion_rate: f64,
    pub played_at: Option<DateTime<Utc>>,
    pub results: Vec<GameResultEntry>,
}

fn default_conversion_rate() -> f64 {
    1.0
}

#[derive(Debug, Deserialize)]
pub struct UpdateGameRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub point_conversion_rate: Option<f64>,
    pub played_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChipRecordRequest {
    pub user_id: i64,
    pub amount: f64,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GameResultEntry {
    pub user_id: i64,
    pub points: f64,
}
