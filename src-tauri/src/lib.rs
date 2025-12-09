pub mod plc;
pub mod io;
pub mod entity;
pub mod pos;
pub mod db;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
