use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

use crate::establish_connection;
use crate::model::{Garment, NewGarment};
use crate::schema::garments;

pub fn count_garments(conn: &mut PgConnection) -> QueryResult<i64> {
    garments::table.count().get_result(conn)
}

pub fn garment_exists(conn: &mut PgConnection) -> bool {
    true
}

pub fn create_garment(conn: &mut PgConnection, 
    full_invoice_number: &str,
    display_invoice_number: &str,
    item_id: &str,
    item_description: &str,
    invoice_dropoff_date: NaiveDateTime,
    invoice_pickup_date: NaiveDateTime,
    invoice_comments: &str,
    slot_number: i32) -> QueryResult<Garment> {
    
    let new_garment = NewGarment {
        full_invoice_number: full_invoice_number.to_string(),
        display_invoice_number: display_invoice_number.to_string(),
        item_id: item_id.to_string(),
        item_description: item_description.to_string(),
        invoice_dropoff_date: invoice_dropoff_date,
        invoice_pickup_date: invoice_pickup_date,
        invoice_comments: invoice_comments.to_string(),
        slot_number: slot_number
    };

    diesel::insert_into(garments::table)
        .values(&new_garment)
        .get_result(conn)
}

