use std::str::FromStr;

use crate::{io::fileutils, pos::{self, spot::spotops_types::{self, add_item_op, delete_item_op, spot_ops_types}}};

#[tauri::command]
pub fn parse_spot_csv(contents: Vec<String>) -> Result<u32, ()> {

    if contents.is_empty() == true || contents.len() == 0 {
        return Err(());
    }

    let mut delete_ops: Vec<delete_item_op> = Vec::new();
    let mut add_ops: Vec<add_item_op> = Vec::new();
    let mut add_op_nums: u32 = 0;
    for line in contents {

        if line.trim().is_empty() {
            continue;
        }

        let mut _fields: Vec<String> = line.split(',').map(|s| s.to_string()).collect();
        
        if _fields.is_empty() || _fields.len() < 3 {
            continue;
        }

        

        let op = spot_ops_types::from_str(&_fields[0]).map_err(|_| ())?;

        if op == spot_ops_types::AddItem {
            add_op_nums += 1;
            // Clean the _fields of extra quotes and call add_item_op creation
            for field in &mut _fields {
                let _cleaned_field = clean_spot_csv_line(field);
            }
            // let add_op = spotops_types::add_item_op::create_add_item_op(
            //     &_fields[1],
            //     &_fields[2],
            //     _fields[3].parse::<u32>().unwrap_or(0),
            //     _fields[4].parse::<u32>().unwrap_or(0),
            //     _fields[5].parse::<f32>().unwrap_or(0.0),
            //     &_fields[6],
            //     &_fields[7],
            //     &_fields[8],
            //     &_fields[9],
            //     &_fields[10],
            //     &_fields[11],
            //     chrono::DateTime::parse_from_rfc3339(&_fields[12]).map_err(|_| ())?.with_timezone(&chrono::Local),
            //     chrono::DateTime::parse_from_rfc3339(&_fields[13]).map_err(|_| ())?.with_timezone(&chrono::Local),
            //     &_fields[14]
            // ).map_err(|_| ())?;
            // add_ops.push(add_op);
        }


        
    }

    Ok(add_op_nums)
}

pub fn clean_spot_csv_line(line: &str) -> String {
    // Each element in the csv has "" around it, so remove them
    line.trim().trim_matches('"').to_string()
}
