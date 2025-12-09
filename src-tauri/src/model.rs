// src/models.rs
use diesel::prelude::*;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::schema::{customers, tickets, users, garments};

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
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub username: String,
    pub pin: String,
    // created_at from DB default
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
