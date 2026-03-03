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
    pub expected_sum_rule: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct GameSession {
    pub id: i64,
    pub game_id: i64,
    pub name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finalized_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct SessionResult {
    pub id: i64,
    pub session_id: i64,
    pub user_id: i64,
    pub points: f64,
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
    pub expected_sum_rule: Option<String>,
}

fn default_conversion_rate() -> f64 {
    1.0
}

#[derive(Debug, Deserialize)]
pub struct UpdateGameRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub point_conversion_rate: Option<f64>,
    pub expected_sum_rule: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SessionResultsRequest {
    pub results: Vec<SessionResultEntry>,
}

#[derive(Debug, Deserialize)]
pub struct SessionResultEntry {
    pub user_id: i64,
    pub points: f64,
}
