use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use diesel::PgConnection;
use std::collections::HashMap;

use crate::{
    db::{
        connection::establish_connection, customer_details_repo, customer_repo,
        garment_details_repo, garment_repo, ticket_details_repo, ticket_repo,
    },
    model::{NewCustomer, NewGarment, NewTicket, NewTicketDetails},
    settings::appsettings::FieldMappings,
};

fn field_opt(fields: &[String], idx: usize) -> Option<String> {
    fields
        .get(idx)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn parse_wincleaners_csv_core(contents: &[String], fm: &FieldMappings) -> Result<u32, String> {
    if contents.is_empty() {
        return Err("EMPTY_FILE".to_string());
    }

    // Pass 1: collect TICKET_CREATE rows → invoice_number → pickup_date_str / extra POS fields
    let mut pickup_dates: HashMap<String, String> = HashMap::new();
    let mut ticket_creates: HashMap<String, NewTicketDetails> = HashMap::new();
    for line in contents {
        let fields = parse_csv_line(line.trim());
        if fields.len() > 3 && fields[0].to_uppercase() == "TICKET_CREATE" {
            let ticket_number = fields[2].clone();
            pickup_dates.insert(ticket_number.clone(), fields[3].clone());
            ticket_creates.insert(
                ticket_number.clone(),
                NewTicketDetails {
                    full_invoice_number: ticket_number,
                    pos_source: "WINCLEANERS".to_string(),
                    plant: field_opt(&fields, 5),
                    route: field_opt(&fields, 6),
                    store: field_opt(&fields, 7),
                    transaction_date: field_opt(&fields, 8),
                    transaction_time: field_opt(&fields, 9),
                },
            );
        }
    }

    // Pass 2: process GARMENT_CREATE rows
    let mut conn = establish_connection()?;
    let mut count = 0u32;
    for line in contents {
        let fields = parse_csv_line(line.trim());
        if fields.is_empty() || fields[0].to_uppercase() != "GARMENT_CREATE" {
            continue;
        }
        handle_garment_create(&fields, &pickup_dates, &ticket_creates, fm, &mut conn)?;
        count += 1;
    }

    Ok(count)
}

fn handle_garment_create(
    fields: &[String],
    pickup_dates: &HashMap<String, String>,
    ticket_creates: &HashMap<String, NewTicketDetails>,
    fm: &FieldMappings,
    conn: &mut PgConnection,
) -> Result<(), String> {
    let get = |idx: u32| -> Result<&str, String> {
        fields.get(idx as usize).map(|s| s.as_str()).ok_or_else(|| {
            format!(
                "Field index {} out of bounds (got {} fields)",
                idx,
                fields.len()
            )
        })
    };

    let full_invoice = get(fm.full_invoice_number)?.to_string();
    let display_invoice = get(fm.display_invoice_number)?.to_string();
    let customer_id = get(fm.customer_identifier)?.to_string();
    let item_id = get(fm.item_id)?.to_string();
    let item_description = get(fm.item_description)?.to_string();
    let comments = get(fm.comments).unwrap_or("").to_string();

    // Wincleaners GARMENT_CREATE rows are one garment each and carry no num-items
    // or slot column of their own; slot assignment is done by ConveyorOS, not the POS.
    let num_items: u32 = 1;
    let slot_occupancy: u32 = 0;

    // No explicit drop-off column either — the row's own TransactionDate/TransactionTime
    // is the moment this garment was entered into the POS, i.e. its drop-off timestamp.
    let transaction_date_idx = fm
        .transaction_date
        .ok_or_else(|| "MISSING_FIELD_MAPPING: transaction_date".to_string())?;
    let transaction_time_idx = fm
        .transaction_time
        .ok_or_else(|| "MISSING_FIELD_MAPPING: transaction_time".to_string())?;
    let dropoff_date = parse_wincleaners_transaction_datetime(
        get(transaction_date_idx)?,
        get(transaction_time_idx)?,
    )?;

    let pickup_date = pickup_dates
        .get(&full_invoice)
        .and_then(|s| parse_wincleaners_date(s).ok())
        .unwrap_or(dropoff_date);

    if !customer_repo::contains_customer_identifier(conn, &customer_id) {
        customer_repo::create_customer(
            conn,
            NewCustomer {
                customer_identifier: customer_id.clone(),
                first_name: String::new(),
                last_name: String::new(),
                phone_number: String::new(),
            },
        )
        .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {e}"))?;
    }

    customer_details_repo::upsert_from_mapped_fields(
        conn,
        fields,
        fm,
        &customer_id,
        "WINCLEANERS",
    )?;
    garment_details_repo::upsert_from_mapped_fields(conn, fields, fm, &item_id, "WINCLEANERS")?;

    if !garment_repo::garment_exists(conn, item_id.clone()) {
        garment_repo::create_garment(
            conn,
            NewGarment {
                item_id: item_id.clone(),
                invoice_comments: comments.clone(),
                item_description: item_description.clone(),
                display_invoice_number: display_invoice.clone(),
                full_invoice_number: full_invoice.clone(),
                invoice_dropoff_date: dropoff_date,
                invoice_pickup_date: pickup_date,
                slot_number: slot_occupancy as i32,
                garment_state: "Not Processed".to_string(),
            },
        )
        .map_err(|e| format!("CREATE_GARMENT_FAILED: {e}"))?;
    }

    if !ticket_repo::ticket_exists(conn, full_invoice.clone()) {
        ticket_repo::create_ticket(
            conn,
            NewTicket {
                full_invoice_number: full_invoice.clone(),
                display_invoice_number: display_invoice.clone(),
                customer_identifier: customer_id.clone(),
                customer_first_name: String::new(),
                customer_last_name: String::new(),
                customer_phone_number: String::new(),
                number_of_items: num_items as i32,
                invoice_dropoff_date: dropoff_date,
                invoice_pickup_date: pickup_date,
                ticket_status: "Not Processed".to_string(),
            },
        )
        .map_err(|e| format!("CREATE_TICKET_FAILED: {e}"))?;
    }

    if let Some(details) = ticket_creates.get(&full_invoice) {
        ticket_details_repo::upsert_ticket_details(conn, details.clone())
            .map_err(|e| format!("UPSERT_TICKET_DETAILS_FAILED: {e}"))?;
    }

    Ok(())
}

fn parse_wincleaners_date(s: &str) -> Result<NaiveDateTime, String> {
    NaiveDate::parse_from_str(s.trim(), "%m/%d/%Y")
        .map(|d| d.and_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap()))
        .map_err(|e| format!("BAD_DATE {:?}: {}", s, e))
}

fn parse_wincleaners_transaction_datetime(
    date_str: &str,
    time_str: &str,
) -> Result<NaiveDateTime, String> {
    let date = NaiveDate::parse_from_str(date_str.trim(), "%m/%d/%Y")
        .map_err(|e| format!("BAD_TRANSACTION_DATE {:?}: {}", date_str, e))?;
    let time = NaiveTime::parse_from_str(time_str.trim(), "%I:%M:%S %p")
        .map_err(|e| format!("BAD_TRANSACTION_TIME {:?}: {}", time_str, e))?;
    Ok(NaiveDateTime::new(date, time))
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    for ch in line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                fields.push(field.trim().to_string());
                field = String::new();
            }
            _ => field.push(ch),
        }
    }
    fields.push(field.trim().to_string());
    fields
}
