use diesel::prelude::*;

use crate::model::{GarmentDetails, NewGarmentDetails};
use crate::schema::garment_details;
use crate::schema::garment_details::dsl::*;
use crate::settings::appsettings::FieldMappings;

pub fn upsert_garment_details(
    conn: &mut PgConnection,
    new_details: NewGarmentDetails,
) -> QueryResult<GarmentDetails> {
    diesel::insert_into(garment_details::table)
        .values(&new_details)
        .on_conflict(item_id)
        .do_update()
        .set(&new_details)
        .get_result(conn)
}

pub fn get_garment_details(
    conn: &mut PgConnection,
    for_item_id: &str,
) -> QueryResult<Option<GarmentDetails>> {
    garment_details
        .filter(item_id.eq(for_item_id))
        .first::<GarmentDetails>(conn)
        .optional()
}

/// Writes a garment_details row from whichever columns `fm` maps for this POS source.
/// Fields with no mapping (or an empty value at that index) are left null.
/// No-ops if the POS's field mappings don't cover any of these columns.
pub fn upsert_from_mapped_fields(
    conn: &mut PgConnection,
    fields: &[String],
    fm: &FieldMappings,
    for_item_id: &str,
    pos_source_name: &str,
) -> Result<(), String> {
    if fm.service_price.is_none()
        && fm.service_type.is_none()
        && fm.garment_color.is_none()
        && fm.transaction_date.is_none()
        && fm.transaction_time.is_none()
    {
        return Ok(());
    }

    let get_opt = |idx: Option<u32>| -> Option<String> {
        idx.and_then(|i| fields.get(i as usize))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };

    upsert_garment_details(
        conn,
        NewGarmentDetails {
            item_id: for_item_id.to_string(),
            pos_source: pos_source_name.to_string(),
            service_price: get_opt(fm.service_price),
            service_type: get_opt(fm.service_type),
            garment_color: get_opt(fm.garment_color),
            transaction_date: get_opt(fm.transaction_date),
            transaction_time: get_opt(fm.transaction_time),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("UPSERT_GARMENT_DETAILS_FAILED: {e}"))
}
