use diesel::prelude::*;

use crate::model::{Garment, NewGarment};
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

    diesel::insert_into(garments::table).values(new_garment).get_result(conn).map_err(|_| "Error creating garment".to_string())
}

pub fn get_garment(conn: &mut PgConnection, item_identifier: &str) -> Result<Garment, String> {
    garments
        .filter(item_id.eq(item_identifier))
        .first::<Garment>(conn)
        .map_err(|e| e.to_string())
}

pub fn list_garments_for_ticket(conn: &mut PgConnection, invoice_number: &str) -> Result<Vec<Garment>, String> {
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

