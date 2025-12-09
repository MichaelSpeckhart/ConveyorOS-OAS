use std::str::FromStr;

use crate::{io::fileutils, pos::{self, spot::spotops_types::{delete_item_op, spot_ops_types}}};

#[tauri::command]
pub fn parse_spot_csv(contents: Vec<String>) -> Result<u32, ()> {

    if contents.is_empty() == true || contents.len() == 0 {
        return Err(());
    }

    let mut delete_ops: Vec<delete_item_op> = Vec::new();

    for line in contents {

        if line.trim().is_empty() {
            continue;
        }

        let _fields: Vec<&str> = line.split(',').collect();
        
        if _fields.is_empty() || _fields.len() < 3 {
            continue;
        }

        let op = spot_ops_types::from_str(_fields[0]).map_err(|_| ())?;

        let delete_op = delete_item_op {
            op_type: op,
            full_invoice_number: _fields[1].trim().to_string(),
            item_id: _fields[2].trim().to_string(),
        };


        delete_ops.push(delete_op);
    }

    Ok(delete_ops.len() as u32)
}

pub fn clean_spot_csv_line(line: &str) -> String {
    // Each element in the csv has "" around it, so remove them
    line.trim().trim_matches('"').to_string()
}
