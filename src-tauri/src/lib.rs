use std::{env, sync::{Arc, atomic::AtomicBool}};

use diesel::{Connection, PgConnection};
use dotenvy::dotenv;
use open62541::ua;
use tauri::Manager;
use tokio::sync::Mutex;

use crate::{db::{connection::establish_connection, data::{data_list_customers, data_list_garments_for_ticket, data_list_tickets_for_customer}, db_migrations::run_db_migrations}, io::fileutils::read_file, opc::opc_client::{AppState, OpcClient, OpcConfig}, pos::spot::spot_file_utils::parse_spot_csv_core, settings::load_settings};

pub mod plc;
pub mod io;
pub mod entity;
pub mod pos;
pub mod db;
pub mod schema;
pub mod model;
pub mod domain;
pub mod tauri_commands;
pub mod settings;
pub mod opc;
pub mod slot_manager;
pub mod result;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {

            let app_handle = app.handle();

            // ✅ load settings from the same store the frontend uses
            let settings = load_settings(&app_handle);
            let p = app
                .path()
                .app_data_dir()
                .expect("app_data_dir")
                .join("settings.json");

            println!("📦 SETTINGS FILE PATH: {}", p.display());
            println!("✅ Loaded settings: {:?}", settings);

            // ✅ build DATABASE_URL from settings and set env var for Diesel
            let database_url = crate::settings::database_url(&settings);
            env::set_var("DATABASE_URL", database_url);
            println!("✅ Set DATABASE_URL env var for Diesel");



            let mut conn = establish_connection();
            run_db_migrations(&mut conn)?;
            // start file watch
            async_watch();

            // ✅ Initialize OPC UA client and manage its state

            let opc = OpcClient::new(OpcConfig {
                endpoint_url: settings.opcServerUrl.to_string(),
                reconnect_backoff: std::time::Duration::from_secs(3),
            });

            println!("✅ OPC Client initialized");

            app.manage(AppState { opc: opc.clone(), hanger_detected: Arc::new(AtomicBool::new(false)), hanger_task: Arc::new(Mutex::new(None)) });

            tauri::async_runtime::spawn(async move {
                if let Err(e) = opc.connect().await {
                    eprintln!("❌ OPC connect failed: {e}");
                }
                opc.start_reconnect_loop();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            plc::client::read_slot_id1,
            plc::client::write_m5_command,
            io::fileutils_tauri::read_file_cmd,
            pos::spot::spot_tauri::parse_spot_csv_tauri,
            tauri_commands::auth_login_user_tauri,
            tauri_commands::auth_create_user_tauri,
            tauri_commands::get_all_users_tauri,
            opc::opc_tauri_commands::station1_jog_fwd,
            opc::opc_tauri_commands::get_target_slot_tauri,
            opc::opc_tauri_commands::slot_run_request_tauri,
            tauri_commands::handle_scan_tauri,
            tauri_commands::ticket_exists_tauri,
            tauri_commands::count_occupied_slots_tauri,
            tauri_commands::get_customer_from_ticket_tauri,
            tauri_commands::get_num_items_on_ticket,
            tauri_commands::get_ticket_from_garment,
            tauri_commands::load_sensor_hanger_tauri,
            tauri_commands::wait_for_hanger_sensor,
            tauri_commands::check_opc_connection_tauri,
            data_list_customers,
            data_list_tickets_for_customer,
            data_list_garments_for_ticket,
            tauri_commands::is_last_garment,
            tauri_commands::get_slot_number_from_barcode_tauri,
            tauri_commands::garment_ticket_on_conveyor_tauri,
            tauri_commands::get_slot_manager_stats,
            tauri_commands::clear_conveyor_tauri,
            greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


pub fn async_watch() {
    tauri::async_runtime::spawn(async {
        loop {
            println!("Async task running...");
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let contents = read_file("/Users/michaelspeckhart/newpos.csv");
            
            let res = parse_spot_csv_core(&contents.unwrap());

            match res {
                Ok(add_ops) => {
                    // println!("Parsed {} add_item_op entries from CSV.", add_ops);
                },
                Err(e) => {
                    println!("Error parsing CSV: {}", e);
                }
            }

            println!("Async task completed an iteration.");
        }
    });
}
