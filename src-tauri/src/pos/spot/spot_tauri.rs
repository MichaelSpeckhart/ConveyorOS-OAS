use tauri::utils::config_v1::parse;

use crate::{io::fileutils::read_file, pos::spot::spot_file_utils::parse_spot_csv_core};


#[tauri::command]
pub fn parse_spot_csv_tauri(path: String) -> Result<u32, ()> {
    // Function implementation remains unchanged
    let mut contents = read_file(path).map_err(|_| ())?;
    println!("File contents read: {} lines", contents.len());
    parse_spot_csv_core(&contents).map_err(|_| ())
}