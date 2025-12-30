use std::env;

use diesel::{Connection, PgConnection};
use dotenvy::dotenv;

use crate::{io::fileutils::read_file, pos::spot::spot_file_utils::parse_spot_csv_core};

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
        .setup(|_app| {async_watch(); Ok(())})
        .invoke_handler(tauri::generate_handler![
            plc::client::read_slot_id1,   
            plc::client::write_m5_command,
            io::fileutils_tauri::read_file_cmd,  
            pos::spot::spot_tauri::parse_spot_csv_tauri,
            tauri_commands::auth_login_user_tauri,
            tauri_commands::auth_create_user_tauri,
            tauri_commands::get_all_users_tauri,
            greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
}


pub fn async_watch() {
    tauri::async_runtime::spawn(async {
        loop {
            println!("Async task running...");
            // Perform your asynchronous operations here
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let contents = read_file("/Users/michaelspeckhart/newpos.csv");
            
            let res = parse_spot_csv_core(&contents.unwrap());

            match res {
                Ok(add_ops) => {
                    println!("Parsed {} add_item_op entries from CSV.", add_ops);
                },
                Err(e) => {
                    println!("Error parsing CSV: {}", e);
                }
            }

            println!("Async task completed an iteration.");
        }
    });
}

