use chrono::{NaiveDate, NaiveTime};

use crate::pos::spot::output::conveyor_ops_types::{ConveyorOpsTypes, LoadItemOp, WinCleanersConveyorOpTypes};
// use crate::schema::garment_details::transaction_date;
use std::io::Write;
use std::sync::RwLock;

const CONVEYOR_CSV_FILE_NAME: &str = "conveyor.csv";
const CONVEYOR_CSV_TEMP_FILE_NAME: &str = "conveyor.csv.temp";

static CONVEYOR_CSV_OUTPUT_DIR: RwLock<String> = RwLock::new(String::new());

pub fn set_conveyor_csv_output_dir(dir: &str) {
    let mut w = CONVEYOR_CSV_OUTPUT_DIR.write().unwrap();
    *w = dir.to_string();
}

fn get_conveyor_csv_paths() -> Result<(String, String), String> {
    let dir = CONVEYOR_CSV_OUTPUT_DIR.read().unwrap().clone();
    if dir.is_empty() {
        return Err("Conveyor CSV output directory not configured".to_string());
    }
    let base = std::path::Path::new(&dir);
    let file = base
        .join(CONVEYOR_CSV_FILE_NAME)
        .to_string_lossy()
        .into_owned();
    let temp = base
        .join(CONVEYOR_CSV_TEMP_FILE_NAME)
        .to_string_lossy()
        .into_owned();
    Ok((file, temp))
}

pub fn write_conveyor_csv_file(
    _operation_type: impl std::fmt::Display,
    lines: &[String],
) -> Result<(), String> {
    let (csv_file, temp_file) = get_conveyor_csv_paths()?;

    let dir = CONVEYOR_CSV_OUTPUT_DIR.read().unwrap().clone();
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create conveyor CSV output directory: {}", e))?;

    if std::fs::exists(&csv_file).unwrap() == true {
        std::fs::copy(&csv_file, &temp_file)
            .map_err(|e| format!("Failed to copy Conveyor CSV to temp file: {}", e))?;

        let mut file = std::fs::OpenOptions::new()
            .append(true)
            .open(&temp_file)
            .map_err(|e| format!("Failed to open Conveyor CSV temp file: {}", e))?;

        for line in lines {
            writeln!(file, "{}", line)
                .map_err(|e| format!("Failed to write to conveyor CSV temp file: {}", e))?;
        }

        drop(file);

        std::fs::rename(&temp_file, &csv_file)
            .map_err(|e| format!("Failed to rename conveyor CSV temp file: {}", e))?;

        return Ok(());
    }

    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&temp_file)
        .map_err(|e| format!("Failed to open conveyor CSV temp file: {}", e))?;

    for line in lines {
        writeln!(file, "{}", line)
            .map_err(|e| format!("Failed to write to conveyor CSV temp file: {}", e))?;
    }

    std::fs::rename(&temp_file, &csv_file)
        .map_err(|e| format!("Failed to rename conveyor CSV temp file: {}", e))?;

    Ok(())
}

pub fn write_load_item(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    item_id: &str,
    slot_number: u32,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::LoadItem.to_string(),
        full_invoice_number,
        item_id,
        slot_number
    );
    write_conveyor_csv_file(ConveyorOpsTypes::LoadItem, &[line])
}

pub fn write_unload_item(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    item_id: &str,
    slot_number: u32,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::UnloadItem.to_string(),
        full_invoice_number,
        item_id,
        slot_number
    );
    write_conveyor_csv_file(ConveyorOpsTypes::UnloadItem, &[line])
}

pub fn write_load_invoice(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    slot_number: u32,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::LoadInvoice.to_string(),
        full_invoice_number,
        slot_number
    );
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_unload_invoice(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    slot_number: u32,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::UnloadInvoice.to_string(),
        full_invoice_number,
        slot_number
    );
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_split_invoice(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    item_id: &str,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::SplitInvoice.to_string(),
        full_invoice_number,
        item_id
    );
    write_conveyor_csv_file(operation_type, &[line])
}

pub fn write_split_invoice_batch(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    item_ids: &[String],
) -> Result<(), String> {
    let mut lines = Vec::new();
    for item_id in item_ids {
        let line = format!(
            "\"{}\",\"{}\",\"{}\"",
            ConveyorOpsTypes::SplitInvoice.to_string(),
            full_invoice_number,
            item_id
        );
        lines.push(line);
    }
    write_conveyor_csv_file(operation_type, &lines)
}

pub fn write_print_invoice(
    operation_type: ConveyorOpsTypes,
    full_invoice_number: &str,
    print_number: u32,
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\"",
        ConveyorOpsTypes::PrintInvoice.to_string(),
        full_invoice_number,
        print_number
    );
    write_conveyor_csv_file(operation_type, &[line])
}

///TICKET_COMPLETE Record Layout
// ------------------------------------------------------------------

//  No          Field                                      Desc.
// ------------------------------------------------------------------

// 1              Transaction                       TICKET_COMPLETE

// 2              CustomerID                      "000014684"

// 3              Ticket_Number                Store # 01 Invoice #123456

// 4              Garment_Number           Heat Seal # "T1476237"

// 5              Employee_Number         Employee No

// 6              Conveyor_ID                     Conveyor ID

// 7              LoadStation_ID                 Load Station ID

// 8              Conveyor_Slot                  Slot No

// 9              Transaction_Date            "04/03/2026"

// 10           Transaction_Time            "06:24:06 AM"
pub fn write_ticket_complete(
    operation_type: WinCleanersConveyorOpTypes,
    customer_id: &str,
    ticket_number: &str,
    garment_number: &str,
    employee_number: &str,
    conveyor_id: &str,
    loadstation_id: &str,
    conveyor_slot: u32,
    transaction_date: NaiveDate,
    transaction_time: NaiveTime
) -> Result<(), String> {
    let line = format!(
        "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"",
        WinCleanersConveyorOpTypes::TicketComplete.to_string(),
        customer_id,
        ticket_number,
        garment_number,
        employee_number,
        conveyor_id,
        loadstation_id,
        conveyor_slot,
        transaction_date,
        transaction_time
    );

    write_conveyor_csv_file(operation_type, &[line])
}
