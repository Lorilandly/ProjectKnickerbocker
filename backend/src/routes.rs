use axum::{
    routing::{delete, get, post},
    Router,
};
use std::sync::Arc;

use crate::auth::{cors_layer, AppState};
use crate::handlers::{
    auth::{google_callback, google_login, logout, me},
    games::{create_game, delete_game, get_game, get_game_results, list_games, update_game},
    halls::{
        assign_user, create_chip_record, create_hall, demote_user, get_hall, invite_user, kick_member,
        leaderboard, list_halls, list_invites, list_members, list_records, promote_user,
    },
    invites::{accept_invite, decline_invite, my_invites},
    stats::{hall_stats, hall_trend, my_history, my_stats},
    users::search_users,
};

pub fn api_routes(state: Arc<AppState>) -> Router {
    let public = Router::new()
        .route("/google", get(google_login))
        .route("/callback", get(google_callback))
        .with_state(state.clone());

    let protected = Router::new()
        .route("/auth/me", get(me))
        .route("/auth/logout", post(logout))
        .route("/halls", get(list_halls).post(create_hall))
        .route("/halls/:id", get(get_hall))
        .route("/halls/:id/members", get(list_members))
        .route("/halls/:id/members/:user_id", delete(kick_member))
        .route("/halls/:id/leaderboard", get(leaderboard))
        .route("/halls/:id/assign", post(assign_user))
        .route("/halls/:id/invite", post(invite_user))
        .route("/halls/:id/promote", post(promote_user))
        .route("/halls/:id/demote", post(demote_user))
        .route("/halls/:id/invites", get(list_invites))
        .route("/halls/:id/chip", post(create_chip_record))
        .route("/halls/:id/records", get(list_records))
        .route("/halls/:id/games", get(list_games).post(create_game))
        .route("/halls/:id/stats", get(hall_stats))
        .route("/halls/:id/trend", get(hall_trend))
        .route("/games/:id", get(get_game).put(update_game).delete(delete_game))
        .route("/games/:id/results", get(get_game_results))
        .route("/invites/me", get(my_invites))
        .route("/invites/:id/accept", post(accept_invite))
        .route("/invites/:id/decline", post(decline_invite))
        .route("/users/me/history", get(my_history))
        .route("/users/me/stats", get(my_stats))
        .route("/users/search", get(search_users))
        .with_state(state.clone());

    Router::new()
        .nest("/api/auth", public)
        .nest("/api", protected)
        .layer(cors_layer())
        .with_state(state)
}
