use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

/// Simple establish connection to Postgres DB
pub fn establish_connection() -> PgConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

/// Safe version that returns Result instead of panicking
pub fn establish_connection_safe() -> Result<PgConnection, String> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL environment variable not set".to_string())?;

    PgConnection::establish(&database_url)
        .map_err(|e| format!("Error connecting to {}: {}", database_url, e))
}

pub fn establish_connection_sqlite() -> SqliteConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}