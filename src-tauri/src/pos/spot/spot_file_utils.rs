use chrono::{Local, NaiveDate, NaiveDateTime, TimeZone};
use diesel::PgConnection;
use std::borrow::Cow;
use std::collections::HashMap;
use std::str::FromStr;

use crate::{
    db::{
        connection::establish_connection, customer_details_repo, customer_repo,
        garment_details_repo, garment_repo, ticket_repo,
    },
    model::{NewCustomer, UpdateTicket},
    pos::spot::{
        output::{
            conveyor_file_utils::write_split_invoice_batch, conveyor_ops_types::ConveyorOpsTypes,
        },
        spotops_types::{self, spot_ops_types},
    },
    settings::appsettings::FieldMappings,
};

fn get_field(fields: &[String], idx: u32) -> Result<&str, String> {
    fields.get(idx as usize).map(|s| s.as_str()).ok_or_else(|| {
        format!(
            "Field index {} out of bounds (got {} fields)",
            idx,
            fields.len()
        )
    })
}

fn get_optional_field(fields: &[String], idx: u32) -> &str {
    fields.get(idx as usize).map(|s| s.as_str()).unwrap_or("")
}

fn parse_spot_datetime(value: &str, field_name: &str) -> Result<chrono::DateTime<Local>, String> {
    let cleaned = value.trim().trim_end_matches('\r');

    let naive = NaiveDateTime::parse_from_str(cleaned, "%Y-%m-%dT%H:%M:%S")
        .or_else(|_| NaiveDateTime::parse_from_str(cleaned, "%Y-%m-%dT%H:%M:%S%.f"))
        .or_else(|_| {
            NaiveDate::parse_from_str(cleaned, "%Y-%m-%d").map(|date| {
                date.and_hms_opt(0, 0, 0)
                    .expect("00:00:00 is always a valid time")
            })
        })
        .map_err(|e| format!("BAD_DATE_{} {:?}: {}", field_name, cleaned, e))?;

    Local
        .from_local_datetime(&naive)
        .single()
        .ok_or_else(|| format!("AMBIGUOUS_{}_TIME", field_name))
}

fn add_item_mapping_is_usable(fields: &[String], fm: &FieldMappings) -> bool {
    let required_text_fields = [
        fm.full_invoice_number,
        fm.display_invoice_number,
        fm.item_id,
        fm.item_description,
    ];

    if required_text_fields.iter().any(|idx| {
        fields
            .get(*idx as usize)
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
    }) {
        return false;
    }

    get_field(fields, fm.dropoff_date)
        .and_then(|value| parse_spot_datetime(value, "DROPOFF").map(|_| ()))
        .is_ok()
        && get_field(fields, fm.pickup_date)
            .and_then(|value| parse_spot_datetime(value, "PICKUP").map(|_| ()))
            .is_ok()
}

fn resolve_add_item_mapping<'a>(
    fields: &[String],
    configured: &'a FieldMappings,
) -> Result<Cow<'a, FieldMappings>, String> {
    if add_item_mapping_is_usable(fields, configured) {
        return Ok(Cow::Borrowed(configured));
    }

    let documented = FieldMappings::default();
    if add_item_mapping_is_usable(fields, &documented) {
        return Ok(Cow::Owned(documented));
    }

    let legacy = FieldMappings::spot_legacy_compact();
    if add_item_mapping_is_usable(fields, &legacy) {
        return Ok(Cow::Owned(legacy));
    }

    Err("BAD_ADD_ITEM_ROW: no compatible SPOT ADDITEM field mapping".to_string())
}

pub fn parse_spot_csv_core(contents: &[String], fm: &FieldMappings) -> Result<u32, String> {
    if contents.is_empty() {
        return Err("EMPTY_FILE".to_string());
    }

    let mut invoice_counts: HashMap<String, u32> = HashMap::new();
    let mut invoice_mappings: HashMap<String, Vec<String>> = HashMap::new();
    let mut conn = establish_connection()?;

    for line in contents {
        if line.trim().is_empty() {
            continue;
        }

        let mut fields: Vec<String> = line.split("\",\"").map(|s| s.to_string()).collect();
        if fields.len() < 3 {
            continue;
        }
        for f in &mut fields {
            *f = clean_spot_csv_line(f);
        }

        let op = spot_ops_types::from_str(&fields[0]).map_err(|_| "BAD_OP".to_string())?;

        if op == spot_ops_types::AddItem {
            let row_fm = resolve_add_item_mapping(&fields, fm)?;
            let invoice_key = get_field(&fields, row_fm.full_invoice_number)?.to_string();
            let count = invoice_counts.entry(invoice_key.clone()).or_insert(0);
            *count += 1;

            if count > &mut 5 {
                let item_id = get_field(&fields, row_fm.item_id)?.to_string();
                invoice_mappings
                    .entry(invoice_key)
                    .or_insert_with(Vec::new)
                    .push(item_id);
            } else {
                handle_add_item_op(&fields, &mut conn, &row_fm)?;
            }
        } else if op == spot_ops_types::DeleteItem {
            handle_delete_item_op(&fields, &mut conn, fm)?;
        } else if op == spot_ops_types::AddInvoice {
            handle_add_invoice_op(&fields, &mut conn)?;
        } else if op == spot_ops_types::DeleteInvoice {
            handle_delete_invoice_op(&fields, &mut conn)?;
        } else {
            return Err(format!("UNSUPPORTED_OP: {}", fields[0]));
        }
    }

    for (invoice_number, item_ids) in invoice_mappings {
        write_split_invoice_batch(ConveyorOpsTypes::SplitInvoice, &invoice_number, &item_ids)?;
        ticket_repo::update_ticket_item_count(&mut conn, &invoice_number, 5)?;
    }

    Ok(0)
}

pub fn handle_delete_item_op(
    fields: &[String],
    conn: &mut PgConnection,
    fm: &FieldMappings,
) -> Result<bool, String> {
    let full_invoice_number = get_field(fields, fm.full_invoice_number)?.to_string();
    if full_invoice_number.is_empty() {
        return Err("BAD_DELETE_ITEM_ROW: full_invoice_number is empty".to_string());
    }

    let ticket_info = ticket_repo::get_ticket_by_invoice_number(conn, &full_invoice_number)?;
    if ticket_info.ticket_status == "Processing" {
        return Ok(false);
    }

    let item_id = get_field(fields, fm.item_id)?.to_string();
    if item_id.is_empty() {
        return Err("BAD_DELETE_ITEM_ROW: item_id is empty".to_string());
    }

    match garment_repo::delete_garment(conn, &item_id)? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err("MULTIPLE_GARMENTS_DELETED".to_string()),
    }
}

pub fn handle_add_item_op(
    fields: &[String],
    conn: &mut PgConnection,
    fm: &FieldMappings,
) -> Result<(), String> {
    let start_local = parse_spot_datetime(get_field(fields, fm.dropoff_date)?, "DROPOFF")?;
    let end_local = parse_spot_datetime(get_field(fields, fm.pickup_date)?, "PICKUP")?;

    let add_op = spotops_types::AddItemOp::create_add_item_op(
        get_field(fields, fm.full_invoice_number)?,
        get_field(fields, fm.display_invoice_number)?,
        get_field(fields, fm.num_items)?.parse::<u32>().unwrap_or(0),
        get_field(fields, fm.slot_occupancy)?
            .parse::<u32>()
            .unwrap_or(0),
        fields
            .get(5)
            .and_then(|s| s.parse::<f32>().ok())
            .unwrap_or(0.0), // balance_due stays at col 5
        get_field(fields, fm.customer_identifier)?,
        fm.customer_first_name
            .map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or(""))
            .unwrap_or(""),
        fm.customer_last_name
            .map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or(""))
            .unwrap_or(""),
        fm.customer_phone
            .map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or(""))
            .unwrap_or(""),
        get_field(fields, fm.item_id)?,
        get_field(fields, fm.item_description)?,
        start_local,
        end_local,
        get_optional_field(fields, fm.comments),
    )
    .map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;

    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {
        create_customer_from_add_op(conn, &add_op)?;
    }
    customer_details_repo::upsert_from_mapped_fields(
        conn,
        &fields,
        fm,
        &add_op.customer_identifier,
        "SPOT",
    )?;
    garment_details_repo::upsert_from_mapped_fields(conn, &fields, fm, &add_op.item_id, "SPOT")?;
    if !garment_repo::garment_exists(conn, add_op.item_id.clone()) {
        create_garment_from_add_op(conn, &add_op)?;
    }
    if !ticket_repo::ticket_exists(conn, add_op.full_invoice_number.clone()) {
        create_ticket_from_add_op(conn, &add_op)?;
    } else {
        update_ticket_from_add_op(conn, &add_op)?;
    }

    Ok(())
}

pub fn handle_add_invoice_op(fields: &[String], conn: &mut PgConnection) -> Result<(), String> {
    if fields.len() < 10 {
        return Err(format!(
            "BAD_ADD_INV_ROW_FIELDS: expected 10+, got {}",
            fields.len()
        ));
    }

    let add_op = spotops_types::AddInvoiceOp::create_add_invoice_op(
        &fields[1],
        &fields[2],
        fields[3].parse::<u32>().unwrap_or(0),
        fields[4].parse::<u32>().unwrap_or(0),
        fields[5].parse::<f32>().unwrap_or(0.0),
        &fields[6],
        &fields[7],
        &fields[8],
        "",
        "",
    )
    .map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;

    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {
        create_customer_from_add_invoice_op(conn, &add_op)?;
    }

    Ok(())
}

pub fn handle_delete_invoice_op(
    _fields: &[String],
    _conn: &mut PgConnection,
) -> Result<(), String> {
    Ok(())
}

pub fn create_customer_from_add_invoice_op(
    conn: &mut PgConnection,
    add_op: &spotops_types::AddInvoiceOp,
) -> Result<(), String> {
    customer_repo::create_customer(
        conn,
        NewCustomer {
            customer_identifier: add_op.customer_identifier.clone(),
            first_name: add_op.customer_first_name.clone(),
            last_name: add_op.customer_last_name.clone(),
            phone_number: add_op.customer_phone_number.clone(),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))
}

pub fn create_garment_from_add_op(
    conn: &mut PgConnection,
    add_op: &spotops_types::AddItemOp,
) -> Result<(), String> {
    garment_repo::create_garment(
        conn,
        crate::model::NewGarment {
            item_id: add_op.item_id.clone(),
            invoice_comments: add_op.invoice_comments.clone(),
            item_description: add_op.item_descriptions.clone(),
            display_invoice_number: add_op.invoice_number.clone(),
            full_invoice_number: add_op.full_invoice_number.clone(),
            invoice_dropoff_date: add_op.invoice_dropoff_date.naive_local(),
            invoice_pickup_date: add_op.invoice_promised_date.naive_local(),
            slot_number: add_op.slot_occupancy as i32,
            garment_state: "Not Processed".to_string(),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("CREATE_GARMENT_FAILED: {}", e))
}

pub fn create_ticket_from_add_op(
    conn: &mut PgConnection,
    add_op: &spotops_types::AddItemOp,
) -> Result<(), String> {
    ticket_repo::create_ticket(
        conn,
        crate::model::NewTicket {
            full_invoice_number: add_op.full_invoice_number.clone(),
            display_invoice_number: add_op.invoice_number.clone(),
            customer_identifier: add_op.customer_identifier.clone(),
            customer_first_name: add_op.customer_first_name.clone(),
            customer_last_name: add_op.customer_last_name.clone(),
            customer_phone_number: add_op.customer_phone_number.clone(),
            number_of_items: add_op.num_items as i32,
            invoice_dropoff_date: add_op.invoice_dropoff_date.naive_local(),
            invoice_pickup_date: add_op.invoice_promised_date.naive_local(),
            ticket_status: "Not Processed".to_string(),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("CREATE_TICKET_FAILED: {}", e))
}

pub fn create_customer_from_add_op(
    conn: &mut PgConnection,
    add_op: &spotops_types::AddItemOp,
) -> Result<(), String> {
    customer_repo::create_customer(
        conn,
        NewCustomer {
            customer_identifier: add_op.customer_identifier.clone(),
            first_name: add_op.customer_first_name.clone(),
            last_name: add_op.customer_last_name.clone(),
            phone_number: add_op.customer_phone_number.clone(),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))
}

pub fn update_ticket_from_add_op(
    conn: &mut PgConnection,
    add_op: &spotops_types::AddItemOp,
) -> Result<(), String> {
    let mut ticket = ticket_repo::get_ticket_by_invoice_number(conn, &add_op.full_invoice_number)?;

    ticket.number_of_items = add_op.num_items as i32;
    if add_op.invoice_dropoff_date.naive_local() > ticket.invoice_dropoff_date {
        ticket.invoice_dropoff_date = add_op.invoice_dropoff_date.naive_local();
    }
    if add_op.invoice_promised_date.naive_local() > ticket.invoice_pickup_date {
        ticket.invoice_pickup_date = add_op.invoice_promised_date.naive_local();
    }

    ticket_repo::update_ticket(
        conn,
        ticket.id,
        &UpdateTicket {
            full_invoice_number: Some(ticket.full_invoice_number.clone()),
            display_invoice_number: Some(ticket.display_invoice_number.clone()),
            number_of_items: Some(ticket.number_of_items),
            invoice_pickup_date: ticket.invoice_pickup_date,
            garments_processed: Some(ticket.garments_processed),
            ticket_status: Some(ticket.ticket_status.clone()),
        },
    )
    .map(|_| ())
    .map_err(|e| format!("UPDATE_TICKET_FAILED: {}", e))
}

pub fn clean_spot_csv_line(line: &str) -> String {
    line.trim().trim_matches('"').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, Timelike};

    fn split_test_line(line: &str) -> Vec<String> {
        line.split("\",\"").map(clean_spot_csv_line).collect()
    }

    #[test]
    fn documented_add_item_layout_accepts_date_only_values() {
        let fields = split_test_line(
            "\"ADDITEM\",\".WAWA02-900001\",\"02-900001\",\"1\",\"0\",\"\",\"999888999\",\"Harry \",\"Truman\",\"\",\"9735076394\",\"000000140\",\"Blue-Shirt\",\"2026-10-18\",\"2026-10-18\",\"\",\"2026-09-04T13:22:29\",\"5478\",\"66 Silver Spring Road\",\"\",\"Short Hills\",\"NJ\",\"07078\",\"\",\"\"",
        );

        let configured = FieldMappings::spot_legacy_compact();
        let mapping = resolve_add_item_mapping(&fields, &configured)
            .expect("documented ADDITEM mapping should be detected");

        assert_eq!(mapping.customer_phone, Some(10));
        assert_eq!(mapping.item_id, 11);
        assert_eq!(mapping.item_description, 12);
        assert_eq!(mapping.dropoff_date, 13);
        assert_eq!(get_field(&fields, mapping.item_id).unwrap(), "000000140");
        assert_eq!(
            get_field(&fields, mapping.item_description).unwrap(),
            "Blue-Shirt"
        );

        let dropoff =
            parse_spot_datetime(get_field(&fields, mapping.dropoff_date).unwrap(), "DROPOFF")
                .unwrap();

        assert_eq!(dropoff.year(), 2026);
        assert_eq!(dropoff.month(), 10);
        assert_eq!(dropoff.day(), 18);
        assert_eq!(dropoff.hour(), 0);
        assert_eq!(dropoff.minute(), 0);
    }

    #[test]
    fn legacy_compact_add_item_layout_still_resolves() {
        let fields = split_test_line(
            "\"ADDITEM\",\".DCDC03-090374\",\"03-090374\",\"6\",\"100\",\"0.00\",\"DC3407\",\"Sabina\",\"Tacitus\",\"801-208-2200\",\"AA90664756\",\"Shirts-Regular Hang - Black,Solid\",\"2025-04-18T14:27:49\",\"2025-04-22T17:00:00\",\"Do not crease\"",
        );

        let configured = FieldMappings::default();
        let mapping = resolve_add_item_mapping(&fields, &configured)
            .expect("legacy ADDITEM mapping should still be detected");

        assert_eq!(mapping.customer_phone, Some(9));
        assert_eq!(mapping.item_id, 10);
        assert_eq!(mapping.item_description, 11);
        assert_eq!(mapping.dropoff_date, 12);
        assert_eq!(get_field(&fields, mapping.item_id).unwrap(), "AA90664756");
        assert_eq!(
            get_field(&fields, mapping.item_description).unwrap(),
            "Shirts-Regular Hang - Black,Solid"
        );
    }
}
