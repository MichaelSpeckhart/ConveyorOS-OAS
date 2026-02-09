


#[tauri::command]
pub fn read_file_cmd(path: String) -> Result<Vec<String>, String> {
    match crate::io::fileutils::read_file(path) {
        Ok(lines) => Ok(lines),
        Err(err) => Err(err.to_string()),
    }
}


