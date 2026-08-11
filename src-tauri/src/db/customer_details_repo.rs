use diesel::prelude::*;

use crate::model::{CustomerDetails, NewCustomerDetails};
use crate::schema::customer_details;
use crate::schema::customer_details::dsl::*;
use crate::settings::appsettings::FieldMappings;

pub fn upsert_customer_details(
    conn: &mut PgConnection,
    new_details: NewCustomerDetails,
) -> QueryResult<CustomerDetails> {
    diesel::insert_into(customer_details::table)
        .values(&new_details)
        .on_conflict(customer_identifier)
        .do_update()
        .set(&new_details)
        .get_result(conn)
}

/// Writes a customer_details row from whichever address columns `fm` maps for this POS
/// source. Fields with no mapping (or an empty value at that index) are left null.
/// No-ops if the POS's field mappings don't cover any address column.
pub fn upsert_from_mapped_fields(
    conn: &mut PgConnection,
    fields: &[String],
    fm: &FieldMappings,
    for_identifier: &str,
    pos_source_name: &str,
) -> Result<(), String> {
    if fm.address_one.is_none()
        && fm.address_two.is_none()
        && fm.city.is_none()
        && fm.state.is_none()
        && fm.zip_code.is_none()
    {
        return Ok(());
    }

    let get_opt = |idx: Option<u32>| -> Option<String> {
        idx.and_then(|i| fields.get(i as usize))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };

    upsert_customer_details(
        conn,
        NewCustomerDetails {
            customer_identifier: for_identifier.to_string(),
            pos_source: pos_source_name.to_string(),
            address_one: get_opt(fm.address_one),
            address_two: get_opt(fm.address_two),
            city: get_opt(fm.city),
            state: get_opt(fm.state),
            zip_code: get_opt(fm.zip_code),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("UPSERT_CUSTOMER_DETAILS_FAILED: {e}"))
}

pub fn get_customer_details(
    conn: &mut PgConnection,
    for_identifier: &str,
) -> QueryResult<Option<CustomerDetails>> {
    customer_details
        .filter(customer_identifier.eq(for_identifier))
        .first::<CustomerDetails>(conn)
        .optional()
}
