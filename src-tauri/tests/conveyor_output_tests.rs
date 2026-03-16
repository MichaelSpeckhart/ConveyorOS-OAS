
use conveyoros_oas_lib::{io::fileutils::read_file, pos::spot::output::conveyor_file_utils::set_conveyor_csv_output_dir, pos::spot::spot_file_utils::parse_spot_csv_core, tauri_commands};

pub fn db_setup() {
    use conveyoros_oas_lib::db::connection::set_database_url;

    set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");
}


// #[test]
// pub fn test_load_item_output() {

//     use conveyoros_oas_lib::db::connection::set_database_url;

//     set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");

//     let item_id: &str = "111222";
//     let slot_num: u32 = 44;

//     let result = tauri_commands::perform_load_item_op_non_tauri(item_id.to_string(), slot_num);
    
//     // This will show you the actual error if it fails
//     println!("{}",result.unwrap());
// }

// #[test]
// pub fn test_invalid_barcode_load() {
//     use conveyoros_oas_lib::db::connection::set_database_url;

//     set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");

//     let item_id: &str = "123455667677";
//     let slot_num: u32 = 56;

//     let result = tauri_commands::perform_load_item_op_non_tauri(item_id.to_string(), slot_num);

//     assert!(result.err() == Some("Garment Not Found".to_string()));

// }

// #[test]
// pub fn test_batch_load_item() {
//     use conveyoros_oas_lib::db::connection::set_database_url;

//     set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");

//     let item_id_one = "111222";
//     let item_id_two = "111333";
//     let item_id_three = "111444";

//     let slot_num = 44;

//     let num_writes = 3;

//     let result_one = tauri_commands::perform_load_item_op_non_tauri(item_id_one.to_string(), slot_num);
//     let result_two = tauri_commands::perform_load_item_op_non_tauri(item_id_two.to_string(), slot_num);
//     let result_three = tauri_commands::perform_load_item_op_non_tauri(item_id_three.to_string(), slot_num);

    

// }

// #[test]
// pub fn test_unload_item_valid() {
//     db_setup();

//     let item_id = "111222";
//     let slot_num = 44;

//     let result = tauri_commands::perform_unload_item_op_non_tauri(item_id.to_string(), slot_num);


//     assert!(result.is_err() == false);
//     // assert!(result.err() != Some("Garment Not Found".to_string()));
//     assert!(result.unwrap() == true);
// }

#[test] 
pub fn test_split_invoice_valid() {
    db_setup();

    let item_id = "111222";
    let invoice_number = ".DCDC03-090372";

    let result = tauri_commands::perform_split_invoice_op_non_tauri(invoice_number.to_string(), item_id.to_string());

    assert!(result.is_err() == false);
    // assert!(result.err() != Some("Garment Not Found".to_string()));
    assert!(result.unwrap() == true);
}

#[test]
pub fn test_split_invoice_six_add_items() {
    db_setup();

    set_conveyor_csv_output_dir("/Users/michaelspeckhart/");

    let csv_file = "/Users/michaelspeckhart/pos.csv";

    let contents = match read_file(csv_file) {
                Ok(c) => c,
                Err(e) => {
                    panic!("[FileWatch] ERROR reading file: {}", e);
                }
            };

    match parse_spot_csv_core(&contents) {
                Ok(count) => {
                    println!("[FileWatch] Parsing succeeded (result={})", count);
                }
                Err(e) => {
                    println!("[FileWatch] ERROR parsing CSV: {}", e);
                    println!("[FileWatch] File NOT deleted due to parse error");
                }
            }
    

}
