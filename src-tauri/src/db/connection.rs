use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

/// Establish connection to Postgres DB
pub fn establish_connection() -> Result<PgConnection, String> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL environment variable not set".to_string())?;

    PgConnection::establish(&database_url)
        .map_err(|e| format!("Error connecting to {}: {}", database_url, e))
}
