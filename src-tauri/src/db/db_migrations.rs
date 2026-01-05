use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn run_db_migrations(conn: &mut PgConnection) -> Result<(), String> {
    conn.run_pending_migrations(MIGRATIONS)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

