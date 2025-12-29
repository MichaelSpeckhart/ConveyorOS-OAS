use std::str::FromStr;
use chrono::{NaiveDateTime, Local, TimeZone};

use crate::{
  db::{connection::establish_connection, customer_repo},
  model::NewCustomer,
  pos::spot::spotops_types::{self, add_item_op, spot_ops_types},
};

pub fn parse_spot_csv_core(contents: &[String]) -> Result<u32, String> {
    if contents.is_empty() {
        return Err("EMPTY_FILE".to_string());
    }
    //print all of contents
    println!("Parsing SPOT CSV with {} lines", contents.len());
    // print all of contents
    for (i, line) in contents.iter().enumerate() {
        println!("  Line[{}]: {}", i, line);
    }
    let mut add_op_nums: u32 = 0;

    //  single DB connection
    let mut conn = establish_connection();

    for line in contents {
        if line.trim().is_empty() {
            continue;
        }

        let mut fields: Vec<String> = line.split("\",\"").map(|s| s.to_string()).collect();
        // print fields
        for (i, field) in fields.iter().enumerate() {
            println!("    Field[{}]: {}", i, field);
        }
        if fields.len() < 3 {
            continue;
        }

        for f in &mut fields {
            *f = clean_spot_csv_line(f);
        }

        let op = spot_ops_types::from_str(&fields[0])
            .map_err(|_| "BAD_OP".to_string())?;

        println!("Parsed operation: {}", op);

        if op == spot_ops_types::AddItem {
            add_op_nums += 1;
            println!("Processing Add Item operation...");
            // print fields
            for (i, field) in fields.iter().enumerate() {
                println!("  Field[{}]: {}", i, field);
            }   
            // Guard against short lines before indexing [3..14]
            if fields.len() < 14 {
                println!("Bad add item line, insufficient fields: {}", line);
                return Err(format!("BAD_ADD_ROW_FIELDS: expected 14+, got {}", fields.len()));
            }

            let start_str = fields[12].trim().trim_end_matches('\r');
            let end_str   = fields[13].trim().trim_end_matches('\r');
                    
            let start_naive = NaiveDateTime::parse_from_str(start_str, "%Y-%m-%dT%H:%M:%S")
                .map_err(|e| format!("BAD_DATE_12 {:?}: {}", start_str, e))?;
                    
            let end_naive = NaiveDateTime::parse_from_str(end_str, "%Y-%m-%dT%H:%M:%S")
                .map_err(|e| format!("BAD_DATE_13 {:?}: {}", end_str, e))?;
                    
            // Convert to DateTime<Local> if your add_item_op expects that
            let start_local = Local
                .from_local_datetime(&start_naive)
                .single()
                .ok_or_else(|| "AMBIGUOUS_START_TIME".to_string())?;
                    
            let end_local = Local
                .from_local_datetime(&end_naive)
                .single()
                .ok_or_else(|| "AMBIGUOUS_END_TIME".to_string())?;

            let add_op = spotops_types::add_item_op::create_add_item_op(
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


            println!("Created Add Item Operation: {:?}", add_op);

            
            if !customer_repo::contains_customer_identifier(&mut conn, &add_op.customer_identifier) {
                println!("Creating new customer: {}", add_op.customer_identifier);
                let new_customer = NewCustomer {
                    customer_identifier: add_op.customer_identifier.clone(),
                    first_name: add_op.customer_first_name.clone(),
                    last_name: add_op.customer_last_name.clone(),
                    phone_number: add_op.customer_phone_number.clone(),
                };

                customer_repo::create_customer(&mut conn, new_customer)
                    .map_err(|e| format!("CREATE_CUSTOMER_FAILED: {}", e))?;
            }

            

            
        }
    }

    Ok(add_op_nums)
}

pub fn clean_spot_csv_line(line: &str) -> String {
    line.trim().trim_matches('"').to_string()
}
