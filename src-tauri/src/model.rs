// src/models.rs
use diesel::{prelude::*};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::schema::{app_state, customers, garments, slots, tickets, users, sessions};

//
// CUSTOMERS
//

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = customers)]
pub struct Customer {
    pub id: i32,
    pub customer_identifier: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = customers)]
pub struct NewCustomer {
    pub customer_identifier: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: String,
    // created_at will be set by DB default
}

//
// TICKETS
//

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = tickets)]
pub struct Ticket {
    pub id: i32,
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub number_of_items: i32,
    pub customer_identifier: String,
    pub customer_first_name: String,
    pub customer_last_name: String,
    pub customer_phone_number: String,
    pub invoice_dropoff_date: NaiveDateTime,
    pub invoice_pickup_date: NaiveDateTime,
    pub created_at: NaiveDateTime,
    pub garments_processed: i32,
    pub ticket_status: String,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = tickets)]
pub struct NewTicket {
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub number_of_items: i32,
    pub customer_identifier: String,
    pub customer_first_name: String,
    pub customer_last_name: String,
    pub customer_phone_number: String,
    pub invoice_dropoff_date: NaiveDateTime,
    pub invoice_pickup_date: NaiveDateTime,
    pub ticket_status: String,
    // created_at from DB default
}

//
// USERS (internal operators)
//

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub pin: String,
    pub created_at: NaiveDateTime,
    pub is_admin: i32,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub username: String,
    pub pin: String,
    pub is_admin: i32,
    // created_at from DB default
}

//
// SESSIONS
//

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = sessions)]
pub struct Session {
    pub id: i32,
    pub user_id: i32,
    pub login_at: NaiveDateTime,
    pub logout_at: Option<NaiveDateTime>,
    pub garments_scanned: i32,
    pub tickets_completed: i32,
    pub is_admin: i32,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = sessions)]
pub struct NewSession {
    pub user_id: i32,
}

//
// GARMENTS
//

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = garments)]
pub struct Garment {
    pub id: i32,
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub item_id: String,
    pub item_description: String,
    pub invoice_dropoff_date: NaiveDateTime,
    pub invoice_pickup_date: NaiveDateTime,
    pub invoice_comments: String,
    pub slot_number: i32,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = garments)]
pub struct NewGarment {
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub item_id: String,
    pub item_description: String,
    pub invoice_dropoff_date: NaiveDateTime,
    pub invoice_pickup_date: NaiveDateTime,
    pub invoice_comments: String,
    pub slot_number: i32,
}

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = slots)]
#[diesel(primary_key(slot_number))]
pub struct Slot {
    pub slot_number: i32,
    pub slot_state: String,
    pub assigned_ticket: Option<String>,
    pub item_id: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SlotState {
    Empty,
    Reserved,
    Occupied,
    Blocked,
    Error,
}

impl SlotState {
    pub fn as_str(self) -> &'static str {
        match self {
            SlotState::Empty => "empty",
            SlotState::Reserved => "reserved",
            SlotState::Occupied => "occupied",
            SlotState::Blocked => "blocked",
            SlotState::Error => "error",
        }
    }

    pub fn from_db(value: &str) -> Option<Self> {
        match value {
            "empty" => Some(Self::Empty),
            "reserved" => Some(Self::Reserved),
            "occupied" => Some(Self::Occupied),
            "blocked" => Some(Self::Blocked),
            "error" => Some(Self::Error),
            _ => None,
        }
    }
}

#[derive(Debug, Queryable, Identifiable, Serialize)]
#[diesel(table_name = app_state)]
pub struct AppStateRow {
    pub id: i32,
    pub last_used_slot: i32,
    pub num_items_on_conveyor: i32,
    pub updated_at: chrono::NaiveDateTime,
}

use diesel::AsChangeset;

#[derive(AsChangeset)]
#[diesel(table_name = tickets)]
pub struct UpdateTicket {
    pub full_invoice_number: Option<String>,
    pub display_invoice_number: Option<String>,
    pub garments_processed: Option<i32>,
    pub number_of_items: Option<i32>,
    pub invoice_pickup_date: chrono::NaiveDateTime,
    pub ticket_status: Option<String>
}

pub struct OperatorStats {
    pub user_id: i32,
    pub username: String,
    pub total_garments: i64,
    pub total_tickets: i64,
}

