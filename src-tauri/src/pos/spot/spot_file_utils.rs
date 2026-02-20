use std::str::FromStr;
use chrono::{DateTime, Local, NaiveDateTime, TimeZone};
use diesel::PgConnection;

use crate::{
  db::{connection::establish_connection, customer_repo, garment_repo, ticket_repo::{self, ticket_exists}},
  model::{NewCustomer, UpdateTicket},
  pos::spot::spotops_types::{self, spot_ops_types},
};

pub fn parse_spot_csv_core(contents: &[String]) -> Result<u32, String> {
    if contents.is_empty() {
        return Err("EMPTY_FILE".to_string());
    }
    
    // Single DB connection
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

        let op = spot_ops_types::from_str(&fields[0])
            .map_err(|_| "BAD_OP".to_string())?;

        if op == spot_ops_types::AddItem {
            handle_add_item_op(&fields, &mut conn)?;
            
        } else if op == spot_ops_types::DeleteItem {

            handle_delete_item_op(&fields, &mut conn)?;

        } else if op == spot_ops_types::AddInvoice {

            handle_add_invoice_op(&fields, &mut conn)?;

        } else if op == spot_ops_types::DeleteInvoice {

            handle_delete_invoice_op(&fields, &mut conn)?;

        } else {

            return Err(format!("UNSUPPORTED_OP: {}", fields[0]));

        }
    }

    

    Ok(0)
}


pub fn handle_delete_item_op(fields: &Vec<String>, conn: &mut PgConnection) -> Result<bool, String> {
    if fields.len() != 3 {
        println!("Bad add item line, insufficient fields: {}", fields.len());
        return Err(format!("BAD_DEL_ROW_FIELDS: expected 3, got {}", fields.len()));
    }

    let full_invoice_number: String = fields[1].clone();
    if full_invoice_number.is_empty()
    {
        return Err(format!("BAD_DELETE_ITEM_ROW_FIELDSL full_invoice_number is empty"));
    }

    let ticket_info = ticket_repo::get_ticket_by_invoice_number(conn, &full_invoice_number)?;

    if ticket_info.ticket_status == "Processing" {
        return Ok(false);
    }

    let item_id: String = fields[2].clone();
    if item_id.is_empty()
    {
        return Err(format!("BAD_DELETE_ITEM_ROW_FIELDSL item_id is empty"));
    }

    match garment_repo::delete_garment(conn, &item_id.to_string())? {
        0 => {
            return Ok(false);
        }
        1 => {
            return Ok(true);
        }
        _ => {
            return Err(format!("MULTIPLE_GARMENTS_DELETED"));
        }
    }

}

pub fn handle_add_item_op(fields: &Vec<String>, conn: &mut PgConnection) -> Result<(), String> {
    if fields.len() < 14 {
        println!("Bad add item line, insufficient fields: {}", fields.len());
        return Err(format!("BAD_ADD_ROW_FIELDS: expected 14+, got {}", fields.len()));
    }

    let start_str = fields[12].trim().trim_end_matches('\r');
    
    let end_str   = fields[13].trim().trim_end_matches('\r');

    // Print the fields with their associated index
    for (i, field) in fields.iter().enumerate() {
        println!("Field {}: {}", i, field);
    }

    
    let start_naive = NaiveDateTime::parse_from_str(start_str, "%Y-%m-%dT%H:%M:%S")
    
        .map_err(|e| format!("BAD_DATE_12 {:?}: {}", start_str, e))?;


    
    let end_naive = NaiveDateTime::parse_from_str(end_str, "%Y-%m-%dT%H:%M:%S")
    
        .map_err(|e| format!("BAD_DATE_13 {:?}: {}", end_str, e))?;

    
    let start_local = Local
    
        .from_local_datetime(&start_naive)
    
        .single()
    
        .ok_or_else(|| "AMBIGUOUS_START_TIME".to_string())?;


    
    let end_local = Local
    
        .from_local_datetime(&end_naive)
    
        .single()
    
        .ok_or_else(|| "AMBIGUOUS_END_TIME".to_string())?;

    
    
    let add_op = spotops_types::AddItemOp::create_add_item_op(
    
        &fields[1],
    
        &fields[2],
    
        fields[3].parse::<u32>().unwrap_or(0),
    
        fields[4].parse::<u32>().unwrap_or(0),
    
        fields[5].parse::<f32>().unwrap_or(0.0),
    
        &fields[6],
    
        &fields[7],
    
        &fields[8],
    
        &fields[9],
    
        &fields[10],
    
        &fields[11],
    
        start_local,   
    
        end_local,     
    
        &fields[14],
    
            ).map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;


            
    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {

        create_customer_from_add_op(conn, &add_op)?;

    }

    if !garment_repo::garment_exists(conn, add_op.item_id.clone()) {

        create_garment_from_add_op(conn, &add_op)?;

    }

    if !ticket_repo::ticket_exists(conn, add_op.full_invoice_number.clone()) {

        create_ticket_from_add_op(conn, &add_op)?;

    }
    else {
        // Update Ticket with new item count and dropoff/pickup dates if necessary
        update_ticket_from_add_op(conn, &add_op)?;

    }

    Ok(())
}


pub fn handle_add_invoice_op(fields: &Vec<String>, conn: &mut PgConnection) -> Result<(), String> {

    if fields.len() < 10 {

        println!("Bad add invoice line, insufficient fields: {}", fields.len());

        return Err(format!("BAD_ADD_INV_ROW_FIELDS: expected 10+, got {}", fields.len()));

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
    
        ""
    
        ).map_err(|e| format!("ADD_OP_CREATE_FAILED: {}", e))?;

    
    if !customer_repo::contains_customer_identifier(conn, &add_op.customer_identifier) {

        create_customer_from_add_invoice_op(conn, &add_op)?;

    }

    if !ticket_repo::ticket_exists(conn, add_op.full_invoice_number.to_string()) {


    }
    Ok(())
}

pub fn handle_delete_invoice_op(fields: &Vec<String>, conn: &mut PgConnection) -> Result<(), String> {
    // Implement logic to handle deleting an invoice
    Ok(())
}

pub fn create_customer_from_add_invoice_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddInvoiceOp) -> Result<(), String> {
    let new_customer = NewCustomer {
        customer_identifier: add_op.customer_identifier.clone(),
        first_name: add_op.customer_first_name.clone(),
        last_name: add_op.customer_last_name.clone(),
        phone_number: add_op.customer_phone_number.clone(),
    };

    customer_repo::create_customer(conn, new_customer)
        .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))?;

    Ok(())
}

pub fn create_ticket_from_add_invoice_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddInvoiceOp) -> Result<(), String> {
    
    let new_status: &str = "Not Processed";
    
    let new_ticket = crate::model::NewTicket {
    
        full_invoice_number: add_op.full_invoice_number.clone(),
    
        display_invoice_number: add_op.display_invoice_number.clone(),
    
        customer_identifier: add_op.customer_identifier.clone(),
    
        customer_first_name: add_op.customer_first_name.clone(),
    
        customer_last_name: add_op.customer_last_name.clone(),
    
        customer_phone_number: add_op.customer_phone_number.clone(),
    
        number_of_items: add_op.num_items as i32,
    
        invoice_dropoff_date: NaiveDateTime::from_timestamp_opt(0, 0)
    
            .expect("invalid dropoff placeholder timestamp"), // Placeholder, since AddInvoiceOp doesn't have dropoff date
    
        invoice_pickup_date: NaiveDateTime::from_timestamp_opt(0, 0)
    
            .expect("invalid pickup placeholder timestamp"), // Placeholder, since AddInvoiceOp doesn't have pickup date
    
        ticket_status: new_status.to_string(),
    
    };


    
    ticket_repo::create_ticket(conn, new_ticket)
    
        .map_err(|e| format!("CREATE_TICKET_FAILED: {}", e))?;

    Ok(())
}

/// Create a garment in the database from an AddItemOp
pub fn create_garment_from_add_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {

    println!("Garment invoice comments: {}", add_op.invoice_comments);
    
    let new_garment = crate::model::NewGarment {
    
        item_id: add_op.item_id.clone(),
    
        invoice_comments: add_op.invoice_comments.clone(),
    
        item_description: add_op.item_descriptions.clone(),
    
        display_invoice_number: add_op.invoice_number.clone(),
    
        full_invoice_number: add_op.full_invoice_number.clone(),
    
        invoice_dropoff_date: add_op.invoice_dropoff_date.naive_local(),
    
        invoice_pickup_date: add_op.invoice_promised_date.naive_local(),
    
        slot_number: add_op.slot_occupancy as i32,
    
    };


    
    garment_repo::create_garment(conn, new_garment)
    
        .map_err(|e| format!("CREATE_GARMENT_FAILED: {}", e))?;

    Ok(())
}

pub fn create_ticket_from_add_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    
    let new_status: &str = "Not Processed";
    
    let new_ticket = crate::model::NewTicket {
    
        full_invoice_number: add_op.full_invoice_number.clone(),
    
        display_invoice_number: add_op.invoice_number.clone(),
    
        customer_identifier: add_op.customer_identifier.clone(),
    
        customer_first_name: add_op.customer_first_name.clone(),
    
        customer_last_name: add_op.customer_last_name.clone(),
    
        customer_phone_number: add_op.customer_phone_number.clone(),
    
        number_of_items: add_op.num_items as i32,
    
        invoice_dropoff_date: add_op.invoice_dropoff_date.naive_local(),
    
        invoice_pickup_date: add_op.invoice_promised_date.naive_local(),
    
        ticket_status: new_status.to_string(),
    
    };


    
    ticket_repo::create_ticket(conn, new_ticket)
    
        .map_err(|e| format!("CREATE_TICKET_FAILED: {}", e))?;

    Ok(())
}

pub fn create_customer_from_add_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    
    let new_customer = NewCustomer {
    
        customer_identifier: add_op.customer_identifier.clone(),
    
        first_name: add_op.customer_first_name.clone(),
    
        last_name: add_op.customer_last_name.clone(),
    
        phone_number: add_op.customer_phone_number.clone(),
    
    };

    
    
    customer_repo::create_customer(conn, new_customer)
    
        .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))?;

    Ok(())
}

pub fn update_ticket_from_add_op(conn: &mut diesel::PgConnection, add_op: &spotops_types::AddItemOp) -> Result<(), String> {
    // Fetch existing ticket
    let mut ticket = ticket_repo::get_ticket_by_invoice_number(conn, &add_op.full_invoice_number)?;

    // Update item count
    ticket.number_of_items = add_op.num_items as i32;

    // Update dropoff and pickup dates if the new ones are later than the existing ones
    
    if add_op.invoice_dropoff_date.naive_local() > ticket.invoice_dropoff_date {
    
        ticket.invoice_dropoff_date = add_op.invoice_dropoff_date.naive_local();
    
    }
    
    if add_op.invoice_promised_date.naive_local() > ticket.invoice_pickup_date {
    
        ticket.invoice_pickup_date = add_op.invoice_promised_date.naive_local();
    
    }


    
    let update_ticket = UpdateTicket {
    
        full_invoice_number: Some(ticket.full_invoice_number.clone()),
    
        display_invoice_number: Some(ticket.display_invoice_number.clone()),
    
        number_of_items: Some(ticket.number_of_items),
    
        invoice_pickup_date: (ticket.invoice_pickup_date),
    
        garments_processed: Some(ticket.garments_processed),
    
        ticket_status: Some(ticket.ticket_status.clone()),
    
    };
    
    // Save updates to the database
    
    ticket_repo::update_ticket(conn, ticket.id, &update_ticket)
    
        .map_err(|e| format!("UPDATE_TICKET_FAILED: {}", e))?;

    Ok(())
}



pub fn clean_spot_csv_line(line: &str) -> String {

    line.trim().trim_matches('"').to_string()

}
