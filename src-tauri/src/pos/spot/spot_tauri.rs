use crate::{
    app_log, io::fileutils::read_file, pos::spot::spot_file_utils::parse_spot_csv_core,
    settings::appsettings::FieldMappings,
};

#[tauri::command]
pub fn parse_spot_csv_tauri(path: String) -> Result<u32, String> {
    let contents = read_file(&path).map_err(|e| {
        let message = format!("Failed to read POS CSV file: {}", e);
        app_log::error("POS Import", &message, Some(format!("File: {}", path)));
        message
    })?;
    println!("File contents read: {} lines", contents.len());
    parse_spot_csv_core(&contents, &FieldMappings::default()).map_err(|e| {
        app_log::error(
            "POS Import",
            "Failed to import SPOT POS data",
            Some(format!("File: {}\nError: {}", path, e)),
        );
        e
    })
}
