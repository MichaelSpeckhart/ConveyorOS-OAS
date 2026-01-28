use std::{sync::atomic::Ordering, time::Duration};

use diesel::prelude::*;
use diesel::result::Error::NotFound;
use open62541::ua::Variant;
use serde::Serialize;
use tauri::http::Error;
use tokio::time::{sleep, timeout};

use crate::{db::{connection::establish_connection, garment_repo::{self, garment_exists}, slot_repo::{self, SlotRepo}, ticket_repo, users_repo}, domain::auth, model::{Ticket, UpdateTicket, User}, opc::{opc_client::{AppState, OpcClient}, opc_commands::{get_load_hanger_sensor, slot_run_request}, sensor::hanger_poll_loop}, schema::garments::slot_number, slot_manager::{SlotManager, SlotManagerStats}};

#[derive(Serialize)]
pub struct login_result {
    pub username: String,
    pub id: i32
}

#[tauri::command]
pub fn auth_login_user_tauri(pin_input: String) -> Result<User, String> {
    
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    
    let num_users = auth::count_number_of_users()
        .map_err(|_| "Connection Error".to_string())?;

    
    if num_users == 0 {
        return Err("NO_USERS".into());  
    }

    
    let user = auth::login_user_with_pin(&pin_input)?;

    Ok(user)
}

#[tauri::command]
pub fn auth_create_user_tauri(username_input: String, pin_input: String) -> Result<User, String> {
    
    if username_input.trim().is_empty() {
        return Err("Username cannot be empty".into());
    }
    
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    
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

    let garment = garment_repo::get_garment(&mut conn, &code);
    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", code));
    }

    let ticket = ticket_repo::get_ticket_by_invoice_number(
        &mut conn,
        &garment.unwrap().full_invoice_number,
    );

    if ticket.is_err() {
        return Err(format!("Ticket not found for garment: {}", code));
    }

    let mut ticket_info = ticket.unwrap();

    let on_conveyor = slot_repo::SlotRepo::ticket_on_conveyor(&mut conn, &ticket_info.full_invoice_number);

    if on_conveyor.unwrap() == true {
        ticket_info.garments_processed += 1;

        let update_ticket = &UpdateTicket {
            full_invoice_number: Some(ticket_info.full_invoice_number.clone()),
            display_invoice_number: Some(ticket_info.display_invoice_number.clone()),
            garments_processed: Some(ticket_info.garments_processed),
            invoice_pickup_date: ticket_info.invoice_pickup_date,
            ticket_status: Some(ticket_info.ticket_status)
        };

        let res = ticket_repo::update_ticket(&mut conn, ticket_info.id, update_ticket);

        match slot_repo::SlotRepo::find_ticket_slot(&mut conn, &ticket_info.full_invoice_number)
            .map_err(|e| format!("DB Error (find slot): {e}"))?
        {
            Some(slot) => return Ok(Some(slot.slot_number)),
            None => return Ok(None),
        }

    } else {

    }

    
    ticket_info.garments_processed += 1;

    let new_status: &str = "Processing";

    let update_ticket = &UpdateTicket {
        full_invoice_number: Some(ticket_info.full_invoice_number.clone()),
        display_invoice_number: Some(ticket_info.display_invoice_number.clone()),
        garments_processed: Some(ticket_info.garments_processed),
        invoice_pickup_date: ticket_info.invoice_pickup_date,
        ticket_status: Some(new_status.to_string())
    };

    
    let res = ticket_repo::update_ticket(&mut conn, ticket_info.id, update_ticket);

    
    let reserved_slot = SlotManager::reserve_next_slot(&mut conn, Some(&ticket_info.full_invoice_number))
        .map_err(|e| format!("DB Error (reserve slot): {e}"))?;


    Ok(Some(reserved_slot))
}


#[tauri::command]
pub fn is_last_garment(ticket: String) -> Result<bool, String> {
    let mut conn = establish_connection();

    let garment = garment_repo::get_garment(&mut conn, &ticket);

    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", ticket));
    }

    let ticket = ticket_repo::get_ticket_by_invoice_number(
        &mut conn,
        &garment.unwrap().full_invoice_number,
    );

    if ticket.is_err() {
        return Err(format!("Ticket not found for garment"));
    }

    let ticket = ticket.unwrap();
    let res = ticket.garments_processed + 1 >= ticket.number_of_items;
    Ok(res)
}

#[tauri::command]
pub fn ticket_exists_tauri(ticket: String) -> Result<bool, String> {
    println!("Checking if ticket exists: {}", ticket);
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
pub fn get_ticket_from_garment(barcode: String) -> Result<Ticket, String> {
    let mut conn = establish_connection();
    let garment = garment_repo::get_garment(&mut conn, &barcode);
    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", barcode));
    }
    let res = ticket_repo::get_ticket_by_invoice_number(&mut conn, &garment.unwrap().full_invoice_number)
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

#[tauri::command]
pub async fn get_slot_number_from_barcode_tauri(
    barcode: String
) -> Result<Option<i32>, String> {
    let mut conn = establish_connection();
    let garment = garment_repo::get_garment(&mut conn, &barcode);

    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", barcode));
    }


    match SlotRepo::find_ticket_slot(&mut conn, &barcode)
        .map_err(|e| format!("DB Error (find slot): {e}"))?
    {
        Some(slot) => Ok(Some(slot.slot_number)),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn garment_ticket_on_conveyor_tauri(
    barcode: String
) -> Result<i32, String> {
    let mut conn = establish_connection();

    match SlotRepo::find_ticket_slot(&mut conn, &barcode)
        .map_err(|e| format!("DB Error (find slot): {e}"))?
    {
        Some(slot) => Ok(slot.slot_number),
        None => Err("Garment ticket not on conveyor".to_string()),
    }
}

#[tauri::command]
pub async fn handle_last_scan(barcode: String, slot_num: i32) -> Result<i32, String> {
    // Get the garment
    let mut conn = establish_connection();

    let garment = garment_repo::get_garment(&mut conn, &barcode);
    if garment.is_err() {
        return Err(format!("Garment not found for ticket: {}", barcode));
    }

    let ticket = ticket_repo::get_ticket_by_invoice_number(
        &mut conn,
        &garment.unwrap().full_invoice_number,
    );

    let ticket_info = ticket.unwrap();
    let new_status: &str = "Processed";

    let update_ticket = &UpdateTicket {
        full_invoice_number: Some(ticket_info.full_invoice_number),
        display_invoice_number: Some(ticket_info.display_invoice_number),
        garments_processed: Some(ticket_info.number_of_items),
        invoice_pickup_date: ticket_info.invoice_pickup_date,
        ticket_status: Some(new_status.to_string())
    };

    let res = ticket_repo::update_ticket(&mut conn, ticket_info.id, update_ticket);

    slot_repo::SlotRepo::free_slot(&mut conn, slot_num);

    Ok(slot_num)
}

#[tauri::command]
pub fn get_slot_manager_stats() -> Result<SlotManagerStats, String> {
    let mut conn = establish_connection();
    SlotManagerStats::fetch(&mut conn)
        .map_err(|e| format!("DB Error: {}", e))
}

#[tauri::command]
pub fn clear_conveyor_tauri() -> Result<(), String> {
    let mut conn = establish_connection();

    conn.transaction::<(), diesel::result::Error, _>(|conn| {
        use crate::schema::garments::dsl as garments_dsl;
        use crate::schema::slots::dsl as slots_dsl;
        use crate::schema::tickets::dsl as tickets_dsl;

        let _affected_tickets: Vec<String> = garments_dsl::garments
            .filter(garments_dsl::slot_number.ne(-1))
            .select(garments_dsl::full_invoice_number)
            .distinct()
            .load(conn)?;

        diesel::update(slots_dsl::slots)
            .set((
                slots_dsl::slot_state.eq("empty"),
                slots_dsl::assigned_ticket.eq::<Option<String>>(None),
                slots_dsl::item_id.eq::<Option<String>>(None),
                slots_dsl::updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;

        diesel::update(garments_dsl::garments.filter(garments_dsl::slot_number.ne(-1)))
            .set(garments_dsl::slot_number.eq(-1))
            .execute(conn)?;

        diesel::update(tickets_dsl::tickets)
            .set((
                tickets_dsl::garments_processed.eq(0),
                tickets_dsl::ticket_status.eq("Not Processed"),
            ))
            .execute(conn)?;

        Ok(())
    })
    .map_err(|e| format!("DB Error: {}", e))
}
