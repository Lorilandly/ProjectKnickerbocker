mod auth;
mod db;
mod handlers;
mod models;
mod routes;

use std::sync::Arc;

use crate::auth::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./data/score_tracker.db".into());

    let db = db::init_pool(&database_url).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db).await?;

    let server_admin_emails: Vec<String> = std::env::var("SERVER_ADMIN_EMAILS")
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let state = Arc::new(AppState {
        db,
        session_secret: std::env::var("SESSION_SECRET").unwrap_or_else(|_| "dev-secret".into()),
        google_client_id: std::env::var("GOOGLE_CLIENT_ID")
            .expect("GOOGLE_CLIENT_ID is required for Google OAuth"),
        google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET")
            .expect("GOOGLE_CLIENT_SECRET is required for Google OAuth"),
        server_admin_emails,
        pkce_store: Arc::new(std::sync::Mutex::new(std::collections::HashMap::new())),
    });

    let app = routes::api_routes(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(addr).await?,
        app,
    )
    .await?;

    Ok(())
}
