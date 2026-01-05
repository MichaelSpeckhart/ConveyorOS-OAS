use std::{sync::atomic::Ordering, time::Duration};

use diesel::result::Error::NotFound;
use open62541::ua::Variant;
use serde::Serialize;
use tauri::http::Error;
use tokio::time::{sleep, timeout};

use crate::{db::{connection::establish_connection, garment_repo::{self, garment_exists}, slot_repo::{self, SlotRepo}, ticket_repo, users_repo}, domain::auth, model::{UpdateTicket, User}, opc::{opc_client::{AppState, OpcClient}, opc_commands::{get_load_hanger_sensor, slot_run_request}, sensor::hanger_poll_loop}, slot_manager::SlotManager};

#[derive(Serialize)]
pub struct login_result {
    pub username: String,
    pub id: i32
}

#[tauri::command]
pub fn auth_login_user_tauri(pin_input: String) -> Result<User, String> {
    // Validate PIN
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    // Count users
    let num_users = auth::count_number_of_users()
        .map_err(|_| "Connection Error".to_string())?;

    // If no users exist, return special error
    if num_users == 0 {
        return Err("NO_USERS".into());  // frontend can special-case this
    }

    // Attempt login
    let user = auth::login_user_with_pin(&pin_input)?;

    Ok(user)
}

#[tauri::command]
pub fn auth_create_user_tauri(username_input: String, pin_input: String) -> Result<User, String> {
    // Validate username
    if username_input.trim().is_empty() {
        return Err("Username cannot be empty".into());
    }
    // Validate PIN
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    // Create user
    let new_user = auth::create_user(&username_input, &pin_input)
        .map_err(|_| "Connection Error".to_string())?;
    Ok(new_user)

}

#[tauri::command]
pub fn get_all_users_tauri() -> Result<Vec<User>, String> {
    let mut conn = establish_connection();

    users_repo::get_all_users(&mut conn).map_err(|_| "Connection Error".to_string())
}

#[tauri::command]
pub fn handle_scan_tauri(scan_code: String) -> Result<Option<i32>, String> {
    println!("Handling scan for code: {}", scan_code);
    let code = scan_code.trim().to_string();
    if code.len() < 4 {
        return Err("Scan code too short".to_string());
    }

    let mut conn = establish_connection();

    // 1) If ticket already on conveyor, return its slot number
    match SlotRepo::find_ticket_slot(&mut conn, &code)
        .map_err(|e| format!("DB Error (find slot): {e}"))?
    {
        Some(slot) => return Ok(Some(slot.slot_number)),
        None => {}
    }

    // 2) Reserve next slot for this ticket
    let reserved_slot = SlotManager::reserve_next_slot(&mut conn, Some(&code))
        .map_err(|e| format!("DB Error (reserve slot): {e}"))?;

    // 3) Load garment
    let garment = garment_repo::get_garment(&mut conn, &code)
        .map_err(|_| format!("Garment not found for ticket: {}", code))?;

    // 4) Load ticket using garment invoice number
    let mut ticket = ticket_repo::get_ticket_by_invoice_number(
        &mut conn,
        &garment.full_invoice_number,
    )
    .map_err(|e| format!("DB Error (get ticket): {e}"))?;

    // 5) Update ticket
    ticket.garments_processed += 1;

    // let changes = UpdateTicket {garments_processed:Some(ticket.garments_processed),invoice_pickup_date:ticket.invoice_pickup_date, full_invoice_number: todo!(), display_invoice_number: todo!() };

    // // Pick ONE approach:
    // // A) update by id
    // ticket_repo::update_ticket(&mut conn, ticket.id, &changes)
    //     .map_err(|e| format!("DB Error (update ticket): {e}"))?;

    // OR B) update by invoice number
    // ticket_repo::update_ticket_by_invoice(&mut conn, &ticket.full_invoice_number, &changes)
    //     .map_err(|e| format!("DB Error (update ticket): {e}"))?;

    // 6) Return slot number
    Ok(Some(reserved_slot))
}


#[tauri::command]
pub fn ticket_exists_tauri(ticket: String) -> Result<bool, String> {
    let mut conn = establish_connection();

    let res = garment_exists(&mut conn, ticket);

    Ok(res)
}

#[tauri::command]
pub fn count_occupied_slots_tauri() -> Result<i64, String> {
    let mut conn = establish_connection();
    let res = SlotManager::get_number_occupied_slots(&mut conn)
        .map_err(|e| format!("DB Error: {}", e))?;
    Ok(res)
}

#[tauri::command]
pub fn get_customer_from_ticket_tauri(ticket: String) -> Result<Option<crate::model::Customer>, String> {
    let mut conn = establish_connection();
    let garment = garment_repo::get_garment(&mut conn, &ticket);
    let res = ticket_repo::get_customer_from_ticket(&mut conn, &garment.unwrap().full_invoice_number)
        .map_err(|e| format!("DB Error: {}", e))?;
    Ok(res)
}

#[tauri::command]
pub fn get_num_items_on_ticket(ticket: String) -> Result<i32, String> {
    let mut conn = establish_connection();
    let garment = garment_repo::get_garment(&mut conn, &ticket);

    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", ticket));
    }

    let res = ticket_repo::get_num_items_on_ticket(&mut conn, &garment.unwrap().full_invoice_number)
        .map_err(|e| format!("DB Error: {}", e))?;
    Ok(res)
}

#[tauri::command]
pub async fn wait_for_hanger_sensor(
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    println!("Waiting for hanger sensor...");
    let result = timeout(Duration::from_secs(10), async {
        loop {
            if get_load_hanger_sensor(&state.opc).await? {
                println!("Hanger sensor detected!");
                return Ok(true);
            }
            sleep(Duration::from_millis(10)).await;
        }
    })
    .await;

    match result {
        Ok(Ok(true)) => Ok(true),    // sensor detected
        Ok(Ok(false)) => Ok(false),  // sensor not detected before timeout completion
        Ok(Err(e)) => Err(e),        // read error
        Err(_) => Ok(false),         // ⏱️ timeout
    }
}

#[tauri::command]
pub fn load_sensor_hanger_tauri(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    Ok(state.hanger_detected.load(Ordering::Relaxed))
}

#[tauri::command]
pub fn check_opc_connection_tauri(state: tauri::State<'_, AppState>) -> bool {
    crate::opc::opc_commands::check_opc_connection(&state.opc)
}

