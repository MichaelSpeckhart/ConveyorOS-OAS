use std::env;

use diesel::{Connection, PgConnection};
use dotenvy::dotenv;

pub mod plc;
pub mod io;
pub mod entity;
pub mod pos;
pub mod db;
pub mod schema;
pub mod model;
pub mod domain;
pub mod tauri_commands;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            plc::client::read_slot_id1,   // <--- note the client here
            plc::client::write_m5_command,
            io::fileutils_tauri::read_file_cmd,  // <--- added write command
            pos::spot::spot_file_utils::parse_spot_csv,
            tauri_commands::auth_login_user_tauri,
            tauri_commands::auth_create_user_tauri,
            tauri_commands::get_all_users_tauri
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn establish_connection() -> PgConnection {
    dotenv().ok();
    let url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&url).expect("Error connecting to database")
}
