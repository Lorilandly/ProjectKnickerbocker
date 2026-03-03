use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::str::FromStr;

pub type DbPool = SqlitePool;

pub async fn init_pool(database_url: &str) -> Result<DbPool, sqlx::Error> {
    let opts = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true);
    SqlitePool::connect_with(opts).await
}
