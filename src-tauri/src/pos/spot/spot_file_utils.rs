use std::str::FromStr;
use chrono::{Local, NaiveDateTime, TimeZone};
use diesel::PgConnection;
use std::collections::HashMap;

use crate::{
    db::{connection::establish_connection, customer_repo, garment_repo, ticket_repo},
    model::{NewCustomer, UpdateTicket},
    pos::spot::{
        output::{
            conveyor_file_utils::{write_split_invoice_batch},
            conveyor_ops_types::ConveyorOpsTypes,
        },
        spotops_types::{self, spot_ops_types},
    },
    settings::appsettings::FieldMappings,
};

fn get_field(fields: &[String], idx: u32) -> Result<&str, String> {
    fields
        .get(idx as usize)
        .map(|s| s.as_str())
        .ok_or_else(|| format!("Field index {} out of bounds (got {} fields)", idx, fields.len()))
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
            let invoice_key = get_field(&fields, fm.full_invoice_number)?.to_string();
            let count = invoice_counts.entry(invoice_key.clone()).or_insert(0);
            *count += 1;

            if count > &mut 5 {
                let item_id = get_field(&fields, fm.item_id)?.to_string();
                invoice_mappings
                    .entry(invoice_key)
                    .or_insert_with(Vec::new)
                    .push(item_id);
            } else {
                handle_add_item_op(&fields, &mut conn, fm)?;
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

pub fn handle_delete_item_op(fields: &[String], conn: &mut PgConnection, fm: &FieldMappings) -> Result<bool, String> {
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

pub fn handle_add_item_op(fields: &[String], conn: &mut PgConnection, fm: &FieldMappings) -> Result<(), String> {
    let start_str = get_field(fields, fm.dropoff_date)?.trim().trim_end_matches('\r').to_string();
    let end_str   = get_field(fields, fm.pickup_date)?.trim().trim_end_matches('\r').to_string();

    let start_naive = NaiveDateTime::parse_from_str(&start_str, "%Y-%m-%dT%H:%M:%S")
        .map_err(|e| format!("BAD_DATE_DROPOFF {:?}: {}", start_str, e))?;
    let end_naive = NaiveDateTime::parse_from_str(&end_str, "%Y-%m-%dT%H:%M:%S")
        .map_err(|e| format!("BAD_DATE_PICKUP {:?}: {}", end_str, e))?;

    let start_local = Local
        .from_local_datetime(&start_naive)
        .single()
        .ok_or_else(|| "AMBIGUOUS_START_TIME".to_string())?;
    let end_local = Local
        .from_local_datetime(&end_naive)
        .single()
        .ok_or_else(|| "AMBIGUOUS_END_TIME".to_string())?;

    let add_op = spotops_types::AddItemOp::create_add_item_op(
        get_field(fields, fm.full_invoice_number)?,
        get_field(fields, fm.display_invoice_number)?,
        get_field(fields, fm.num_items)?.parse::<u32>().unwrap_or(0),
        get_field(fields, fm.slot_occupancy)?.parse::<u32>().unwrap_or(0),
        fields.get(5).and_then(|s| s.parse::<f32>().ok()).unwrap_or(0.0), // balance_due stays at col 5
        get_field(fields, fm.customer_identifier)?,
        fm.customer_first_name.map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or("")).unwrap_or(""),
        fm.customer_last_name.map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or("")).unwrap_or(""),
        fm.customer_phone.map(|i| fields.get(i as usize).map(|s| s.as_str()).unwrap_or("")).unwrap_or(""),
        get_field(fields, fm.item_id)?,
        get_field(fields, fm.item_description)?,
        start_local,
        end_local,
        get_field(fields, fm.comments)?,
    ).map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;

    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {
        create_customer_from_add_op(conn, &add_op)?;
    }
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
        return Err(format!("BAD_ADD_INV_ROW_FIELDS: expected 10+, got {}", fields.len()));
    }

    let add_op = spotops_types::AddInvoiceOp::create_add_invoice_op(
        &fields[1], &fields[2],
        fields[3].parse::<u32>().unwrap_or(0),
        fields[4].parse::<u32>().unwrap_or(0),
        fields[5].parse::<f32>().unwrap_or(0.0),
        &fields[6], &fields[7], &fields[8],
        "", "",
    ).map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;

    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {
        create_customer_from_add_invoice_op(conn, &add_op)?;
    }

    Ok(())
}

pub fn handle_delete_invoice_op(_fields: &[String], _conn: &mut PgConnection) -> Result<(), String> {
    Ok(())
}

pub fn create_customer_from_add_invoice_op(conn: &mut PgConnection, add_op: &spotops_types::AddInvoiceOp) -> Result<(), String> {
    customer_repo::create_customer(conn, NewCustomer {
        customer_identifier: add_op.customer_identifier.clone(),
        first_name: add_op.customer_first_name.clone(),
        last_name: add_op.customer_last_name.clone(),
        phone_number: add_op.customer_phone_number.clone(),
    }).map(|_| ()).map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))
}

pub fn create_garment_from_add_op(conn: &mut PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    garment_repo::create_garment(conn, crate::model::NewGarment {
        item_id: add_op.item_id.clone(),
        invoice_comments: add_op.invoice_comments.clone(),
        item_description: add_op.item_descriptions.clone(),
        display_invoice_number: add_op.invoice_number.clone(),
        full_invoice_number: add_op.full_invoice_number.clone(),
        invoice_dropoff_date: add_op.invoice_dropoff_date.naive_local(),
        invoice_pickup_date: add_op.invoice_promised_date.naive_local(),
        slot_number: add_op.slot_occupancy as i32,
    }).map(|_| ()).map_err(|e| format!("CREATE_GARMENT_FAILED: {}", e))
}

pub fn create_ticket_from_add_op(conn: &mut PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    ticket_repo::create_ticket(conn, crate::model::NewTicket {
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
    }).map(|_| ()).map_err(|e| format!("CREATE_TICKET_FAILED: {}", e))
}

pub fn create_customer_from_add_op(conn: &mut PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    customer_repo::create_customer(conn, NewCustomer {
        customer_identifier: add_op.customer_identifier.clone(),
        first_name: add_op.customer_first_name.clone(),
        last_name: add_op.customer_last_name.clone(),
        phone_number: add_op.customer_phone_number.clone(),
    }).map(|_| ()).map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))
}

pub fn update_ticket_from_add_op(conn: &mut PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    let mut ticket = ticket_repo::get_ticket_by_invoice_number(conn, &add_op.full_invoice_number)?;

    ticket.number_of_items = add_op.num_items as i32;
    if add_op.invoice_dropoff_date.naive_local() > ticket.invoice_dropoff_date {
        ticket.invoice_dropoff_date = add_op.invoice_dropoff_date.naive_local();
    }
    if add_op.invoice_promised_date.naive_local() > ticket.invoice_pickup_date {
        ticket.invoice_pickup_date = add_op.invoice_promised_date.naive_local();
    }

    ticket_repo::update_ticket(conn, ticket.id, &UpdateTicket {
        full_invoice_number: Some(ticket.full_invoice_number.clone()),
        display_invoice_number: Some(ticket.display_invoice_number.clone()),
        number_of_items: Some(ticket.number_of_items),
        invoice_pickup_date: ticket.invoice_pickup_date,
        garments_processed: Some(ticket.garments_processed),
        ticket_status: Some(ticket.ticket_status.clone()),
    }).map(|_| ()).map_err(|e| format!("UPDATE_TICKET_FAILED: {}", e))
}

pub fn clean_spot_csv_line(line: &str) -> String {
    line.trim().trim_matches('"').to_string()
}
