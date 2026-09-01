use diesel::prelude::*;

use crate::model::{Garment, GarmentState, NewGarment};
use crate::schema::garments;
use crate::schema::garments::dsl::*;

pub fn count_garments(conn: &mut PgConnection) -> QueryResult<i64> {
    garments::table.count().get_result(conn)
}

pub fn garment_exists(conn: &mut PgConnection, item_identifier: String) -> bool {
    garments
        .filter(item_id.eq(item_identifier))
        .count()
        .get_result::<i64>(conn)
        .map(|count| count > 0)
        .unwrap_or(false)
}

pub fn create_garment(conn: &mut PgConnection, new_garment: NewGarment) -> Result<Garment, String> {
    if garment_exists(conn, new_garment.item_id.clone()) {
        return Err("Garment with this item_id already exists".to_string());
    }

    diesel::insert_into(garments::table)
        .values(new_garment)
        .get_result(conn)
        .map_err(|_| "Error creating garment".to_string())
}

pub fn get_garment(conn: &mut PgConnection, item_identifier: &str) -> Result<Garment, String> {
    garments
        .filter(item_id.eq(item_identifier))
        .first::<Garment>(conn)
        .map_err(|e| e.to_string())
}

pub fn list_garments_for_ticket(
    conn: &mut PgConnection,
    invoice_number: &str,
) -> Result<Vec<Garment>, String> {
    garments
        .filter(full_invoice_number.eq(invoice_number))
        .order(id.asc())
        .load::<Garment>(conn)
        .map_err(|e| e.to_string())
}

pub fn delete_garment(conn: &mut PgConnection, item_identifier: &str) -> Result<usize, String> {
    if !garment_exists(conn, item_identifier.to_string()) {
        return Ok(0);
    }

    diesel::delete(garments.filter(item_id.eq(item_identifier)))
        .execute(conn)
        .map_err(|e| e.to_string())
}

pub fn update_garment_slot(
    conn: &mut PgConnection,
    barcode: &str,
    slot_num: i32,
) -> Result<(), String> {
    diesel::update(garments.filter(item_id.eq(barcode)))
        .set(slot_number.eq(slot_num))
        .execute(conn)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn mark_ticket_garments_processed(
    conn: &mut PgConnection,
    invoice_number: &str,
) -> Result<(), String> {
    diesel::update(garments.filter(full_invoice_number.eq(invoice_number)))
        .set((
            garment_state.eq(GarmentState::Processed.as_str()),
            slot_number.eq(-1),
        ))
        .execute(conn)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn update_garment_code(
    conn: &mut PgConnection,
    current_item_id: &str,
    new_item_id: &str,
) -> Result<Garment, String> {
    let current_code = current_item_id.trim();
    let new_code = new_item_id.trim();

    if current_code.is_empty() {
        return Err("Current garment code is required".to_string());
    }

    if new_code.is_empty() {
        return Err("New garment code is required".to_string());
    }

    let existing = garments
        .filter(item_id.eq(current_code))
        .first::<Garment>(conn)
        .map_err(|_| "Garment not found".to_string())?;

    if current_code == new_code {
        return Ok(existing);
    }

    let duplicate_count = garments
        .filter(item_id.eq(new_code))
        .count()
        .get_result::<i64>(conn)
        .map_err(|e| e.to_string())?;

    if duplicate_count > 0 {
        return Err("Another garment already uses that code".to_string());
    }

    conn.transaction(|conn| {
        diesel::update(garments.filter(item_id.eq(current_code)))
            .set(item_id.eq(new_code))
            .execute(conn)?;

        diesel::update(crate::schema::garment_details::dsl::garment_details.filter(
            crate::schema::garment_details::dsl::item_id.eq(current_code),
        ))
        .set(crate::schema::garment_details::dsl::item_id.eq(new_code))
        .execute(conn)?;

        diesel::update(crate::schema::slots::dsl::slots.filter(
            crate::schema::slots::dsl::item_id.eq(Some(current_code.to_string())),
        ))
        .set(crate::schema::slots::dsl::item_id.eq(Some(new_code.to_string())))
        .execute(conn)?;

        diesel::update(crate::schema::conveyoractivity::dsl::conveyoractivity.filter(
            crate::schema::conveyoractivity::dsl::item_id.eq(current_code),
        ))
        .set(crate::schema::conveyoractivity::dsl::item_id.eq(new_code))
        .execute(conn)?;

        garments
            .filter(item_id.eq(new_code))
            .first::<Garment>(conn)
    })
    .map_err(|e| e.to_string())
}
