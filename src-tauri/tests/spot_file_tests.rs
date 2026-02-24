use conveyoros_oas_lib::{io::fileutils::read_file, pos::spot::spot_file_utils};

const TEST_FILE_PATH: &str = "tests/test_data/pos.csv";

// Private test helper functions

pub fn check_file_exists() -> bool {
    std::path::Path::new(TEST_FILE_PATH).exists()
}

#[test]
pub fn test_file_existence() {
    assert!(check_file_exists(), "Test file does not exist: {}", TEST_FILE_PATH);
}

#[test]
pub fn test_empty_file() {
    let contents: Vec<String> = vec![];

    match spot_file_utils::parse_spot_csv_core(&contents) {
        Ok(_) => {
            panic!("Expected error for empty file, but got Ok");
        },
        Err(e) => {
            assert_eq!(e, "EMPTY_FILE", "Expected EMPTY_FILE error, got {}", e);
        }
    }
}

#[test]
pub fn test_delete_item() {
    let contents =  read_file("/Users/michaelspeckhart/Developer/Samples/Tauri-Sample/ConveyorOS-OAS/src-tauri/tests/test_data/pos.csv").unwrap();

    use conveyoros_oas_lib::db::connection::set_database_url;

    set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");

    match spot_file_utils::parse_spot_csv_core(&contents) {
        Ok(count) => {
            println!("Parsed {} operations successfully.", count);
            assert_eq!(count, 1, "Expected to parse exactly one operation.");
        },
        Err(e) => {
            panic!("Failed to parse spot CSV file: {}", e);
        }
    }
}

// #[test]
// pub fn test_parse_spot_csv_core() {
//     if !check_file_exists() {
//         panic!("Test file does not exist: {}", TEST_FILE_PATH);
//     }

//     let contents = std::fs::read_to_string(TEST_FILE_PATH)
//         .expect("Failed to read test file");

//     let lines: Vec<String> = contents.lines().map(|s| s.to_string()).collect();

//     match spot_file_utils::parse_spot_csv_core(&lines) {
//         Ok(count) => {
//             println!("Parsed {} operations successfully.", count);
//             assert!(count > 0, "Expected at least one operation to be parsed.");
//         },
//         Err(e) => {
//             panic!("Failed to parse spot CSV file: {}", e);
//         }
//     }
// }