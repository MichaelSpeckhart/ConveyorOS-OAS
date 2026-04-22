use std::collections::HashMap;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use diesel::PgConnection;

use crate::{
    db::{connection::establish_connection, customer_repo, garment_repo, ticket_repo},
    model::{NewCustomer, NewGarment, NewTicket},
    settings::appsettings::FieldMappings,
};

pub fn parse_wincleaners_csv_core(contents: &[String], fm: &FieldMappings) -> Result<u32, String> {
    if contents.is_empty() {
        return Err("EMPTY_FILE".to_string());
    }

    // Pass 1: collect TICKET_CREATE rows → invoice_number → pickup_date_str
    let mut pickup_dates: HashMap<String, String> = HashMap::new();
    for line in contents {
        let fields = parse_csv_line(line.trim());
        if fields.len() > 3 && fields[0].to_uppercase() == "TICKET_CREATE" {
            pickup_dates.insert(fields[2].clone(), fields[3].clone());
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
        handle_garment_create(&fields, &pickup_dates, fm, &mut conn)?;
        count += 1;
    }

    Ok(count)
}

fn handle_garment_create(
    fields: &[String],
    pickup_dates: &HashMap<String, String>,
    fm: &FieldMappings,
    conn: &mut PgConnection,
) -> Result<(), String> {
    let get = |idx: u32| -> Result<&str, String> {
        fields
            .get(idx as usize)
            .map(|s| s.as_str())
            .ok_or_else(|| format!("Field index {} out of bounds (got {} fields)", idx, fields.len()))
    };

    let full_invoice     = get(fm.full_invoice_number)?.to_string();
    let display_invoice  = get(fm.display_invoice_number)?.to_string();
    let customer_id      = get(fm.customer_identifier)?.to_string();
    let item_id          = get(fm.item_id)?.to_string();
    let item_description = get(fm.item_description)?.to_string();
    let num_items        = get(fm.num_items)?.parse::<u32>().unwrap_or(1);
    let slot_occupancy   = get(fm.slot_occupancy)?.parse::<u32>().unwrap_or(0);
    let comments         = get(fm.comments).unwrap_or("").to_string();

    let dropoff_date = parse_wincleaners_date(get(fm.dropoff_date)?)?;
    let pickup_date = pickup_dates
        .get(&full_invoice)
        .and_then(|s| parse_wincleaners_date(s).ok())
        .unwrap_or(dropoff_date);

    if !customer_repo::contains_customer_identifier(conn, &customer_id) {
        customer_repo::create_customer(conn, NewCustomer {
            customer_identifier: customer_id.clone(),
            first_name: String::new(),
            last_name: String::new(),
            phone_number: String::new(),
        }).map_err(|e| format!("CREATE_CUSTOMER_FAILED: {e}"))?;
    }

    if !garment_repo::garment_exists(conn, item_id.clone()) {
        garment_repo::create_garment(conn, NewGarment {
            item_id: item_id.clone(),
            invoice_comments: comments.clone(),
            item_description: item_description.clone(),
            display_invoice_number: display_invoice.clone(),
            full_invoice_number: full_invoice.clone(),
            invoice_dropoff_date: dropoff_date,
            invoice_pickup_date: pickup_date,
            slot_number: slot_occupancy as i32,
        }).map_err(|e| format!("CREATE_GARMENT_FAILED: {e}"))?;
    }

    if !ticket_repo::ticket_exists(conn, full_invoice.clone()) {
        ticket_repo::create_ticket(conn, NewTicket {
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
        }).map_err(|e| format!("CREATE_TICKET_FAILED: {e}"))?;
    }

    Ok(())
}

fn parse_wincleaners_date(s: &str) -> Result<NaiveDateTime, String> {
    NaiveDate::parse_from_str(s.trim(), "%m/%d/%Y")
        .map(|d| d.and_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap()))
        .map_err(|e| format!("BAD_DATE {:?}: {}", s, e))
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
