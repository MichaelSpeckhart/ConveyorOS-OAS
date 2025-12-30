use std::{fs::{self, File}, io::{self, BufRead, BufReader}, sync::Condvar};
use std::path::Path;
use std::string::String;

use crate::pos::spot::spot_file_utils::parse_spot_csv_core;

// Read file utility method
// NB: Could impl struct "Reader" with different reading
// methods such as buffered or unbuffered
pub fn read_file(file_name: impl AsRef<Path>) -> io::Result<Vec<String>> {
    let path = file_name.as_ref();

    // first check if file exists on path
    if !check_file_exists(path)? {
        return Err(io::Error::new(io::ErrorKind::NotFound, "File not found"));
    }

    let file = File::open(path)?;
    let reader = BufReader::new(file);

    let mut lines = Vec::new();

    for line in reader.lines() {
        let line = line?;      // line: String
        lines.push(line);
    }

    // delete_file(file_name);
    Ok(lines)
}

// pub fn read_csv_file(csv_file_name: impl AsRef<Path>) -> io::Result<Vec<String>> {
//     let path = csv_file_name.as_ref();

//     if !check_file_exists(path)? {
//         return Err(io::Error::new(io::ErrorKind::NotFound, "File not found"));
//     }

//     let mut rdr = csv::Reader::from_reader(path);

// }

pub fn clean_line(line: &str) -> String {
    line.trim().trim_matches('"').to_string()
}

// Simple file checking method
pub fn check_file_exists(file_name: impl AsRef<std::path::Path>) -> io::Result<bool> {
    let path = file_name.as_ref();

    match path.metadata() {
        Ok(metadata) => Ok(metadata.is_file()),
        Err(err) => {
            if err.kind() == io::ErrorKind::NotFound {
                Ok(false)
            } else {
                Err(err)
            }
        }
    }
}

pub fn delete_file(file_path: impl AsRef<Path>) -> io::Result<()> {
    fs::remove_file(file_path)?;
    Ok(())
}

