use std::fs::File;
use std::io::{self, Read};

pub fn read_file() -> io::Result<String> {

    let file = File::open("example.txt")?;
    let mut buf_reader = io::BufReader::new(file);
    let mut contents = String::new();
    buf_reader.read_to_string(&mut contents)?;
    Ok(contents)
}

