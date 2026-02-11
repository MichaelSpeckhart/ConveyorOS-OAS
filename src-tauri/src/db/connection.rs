use diesel::prelude::*;
use std::sync::RwLock;

static DATABASE_URL: RwLock<String> = RwLock::new(String::new());

/// Set the database URL (called from setup and save_settings)
pub fn set_database_url(url: &str) {
    let mut w = DATABASE_URL.write().unwrap();
    *w = url.to_string();
}

/// Establish connection to Postgres DB
pub fn establish_connection() -> Result<PgConnection, String> {
    //let app_handler = app.
    let database_url = DATABASE_URL
        .read()
        .unwrap()
        .clone();

    if database_url.is_empty() {
        return Err("Database URL not configured".to_string());
    }

    PgConnection::establish(&database_url)
        .map_err(|e| format!("Error connecting to {}: {}", database_url, e))
}
