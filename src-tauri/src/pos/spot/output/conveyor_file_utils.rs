use crate::{pos::spot::output::conveyor_ops_types::ConveyorOpsTypes};
use std::io::Write;



const CONVEYOR_CSV_FILE_NAME: &str = "conveyor.csv";
const CONVEYOR_CSV_TEMP_FILE_NAME: &str = "conveyor.csv.temp";


pub fn write_conveyor_csv_file(operation_type: ConveyorOpsTypes, lines: &[String]) -> Result<(), String> {
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(CONVEYOR_CSV_TEMP_FILE_NAME)
        .map_err(|e| format!("Failed to open conveyor CSV temp file: {}", e))?;

    for line in lines {
        writeln!(file, "{}", line).map_err(|e| format!("Failed to write to conveyor CSV temp file: {}", e))?;
    }

    std::fs::rename(CONVEYOR_CSV_TEMP_FILE_NAME, CONVEYOR_CSV_FILE_NAME)
        .map_err(|e| format!("Failed to rename conveyor CSV temp file: {}", e))?;

    Ok(())
}

pub fn write_load_item(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    item_id: &str,
    slot_number: u32,
) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::LoadItem.to_string(), full_invoice_number, item_id, slot_number);
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_unload_item(operation_type: ConveyorOpsTypes, full_invoice_number: &str,item_id: &str, slot_number: u32) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::UnloadItem.to_string(), full_invoice_number, item_id, slot_number);
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_load_invoice(operation_type: ConveyorOpsTypes, full_invoice_number: &str, slot_number: u32) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::LoadInvoice.to_string(), full_invoice_number, slot_number);
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_unload_invoice(operation_type: ConveyorOpsTypes, full_invoice_number: &str, slot_number: u32) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::UnloadInvoice.to_string(), full_invoice_number, slot_number);
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_split_invoice(operation_type: ConveyorOpsTypes, full_invoice_number: &str, item_id: &str) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::SplitInvoice.to_string(), full_invoice_number, item_id);
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_print_invoice(operation_type: ConveyorOpsTypes, full_invoice_number: &str, print_number: u32) -> Result<(), String> {
    let line = format!("\"{}\",\"{}\",\"{}\"", ConveyorOpsTypes::PrintInvoice.to_string(), full_invoice_number, print_number);
    write_conveyor_csv_file(operation_type, &[line])
}