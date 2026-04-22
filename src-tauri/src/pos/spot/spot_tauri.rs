use crate::{
    io::fileutils::read_file,
    pos::spot::spot_file_utils::parse_spot_csv_core,
    settings::appsettings::FieldMappings,
};

#[tauri::command]
pub fn parse_spot_csv_tauri(path: String) -> Result<u32, ()> {
    let contents = read_file(path).map_err(|_| ())?;
    println!("File contents read: {} lines", contents.len());
    parse_spot_csv_core(&contents, &FieldMappings::default()).map_err(|_| ())
}
