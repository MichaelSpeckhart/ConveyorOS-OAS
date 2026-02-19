use diesel::prelude::*;

use crate::db::connection::establish_connection;
use crate::schema::{customers, tickets, garments};

#[derive(serde::Serialize, Queryable)]
pub struct CustomerRow {
    pub id: i32,
    pub customer_identifier: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: String,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(serde::Serialize, Queryable)]
pub struct TicketRow {
    pub id: i32,
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub number_of_items: i32,
    pub customer_identifier: String,
    pub customer_first_name: String,
    pub customer_last_name: String,
    pub customer_phone_number: String,
    pub invoice_dropoff_date: chrono::NaiveDateTime,
    pub invoice_pickup_date: chrono::NaiveDateTime,
    pub created_at: chrono::NaiveDateTime,
    pub garments_processed: i32,
    pub ticket_status: String,
}

#[derive(serde::Serialize, Queryable)]
pub struct GarmentRow {
    pub id: i32,
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub item_id: String,
    pub item_description: String,
    pub invoice_dropoff_date: chrono::NaiveDateTime,
    pub invoice_pickup_date: chrono::NaiveDateTime,
    pub invoice_comments: String,
    pub slot_number: i32,
}

#[tauri::command]
pub fn data_list_customers(query: Option<String>) -> Result<Vec<CustomerRow>, String> {
    let mut conn = establish_connection()?;
    let mut q = customers::table.into_boxed();

    if let Some(search) = query {
        let pat = format!("%{}%", search.trim());

        q = q.filter(
            customers::first_name.ilike(pat.clone())
                .or(customers::last_name.ilike(pat.clone()))
                .or(customers::phone_number.ilike(pat.clone()))
                .or(customers::customer_identifier.ilike(pat)),
        );
    }

    q.order(customers::last_name.asc())
        .limit(200)
        .load::<CustomerRow>(&mut conn)
        .map_err(|e| e.to_string())
}


#[tauri::command]
pub fn data_list_all_tickets(query: Option<String>) -> Result<Vec<TicketRow>, String> {
    let mut conn = establish_connection()?;
    let mut q = tickets::table.into_boxed();

    if let Some(search) = query {
        let pat = format!("%{}%", search.trim());

        q = q.filter(
            tickets::display_invoice_number.ilike(pat.clone())
                .or(tickets::customer_first_name.ilike(pat.clone()))
                .or(tickets::customer_last_name.ilike(pat.clone()))
                .or(tickets::customer_phone_number.ilike(pat.clone()))
                .or(tickets::ticket_status.ilike(pat)),
        );
    }

    q.order(tickets::invoice_dropoff_date.desc())
        .limit(200)
        .load::<TicketRow>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn data_list_tickets_for_customer(customer_identifier: String) -> Result<Vec<TicketRow>, String> {
    let mut conn = establish_connection()?;

    tickets::table
        .filter(tickets::customer_identifier.eq(customer_identifier))
        .order(tickets::invoice_dropoff_date.desc())
        .limit(200)
        .load::<TicketRow>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn data_list_garments_for_ticket(full_invoice_number: String) -> Result<Vec<GarmentRow>, String> {
    let mut conn = establish_connection()?;

    garments::table
        .filter(garments::full_invoice_number.eq(full_invoice_number))
        .order(garments::id.asc())
        .limit(500)
        .load::<GarmentRow>(&mut conn)
        .map_err(|e| e.to_string())
}
