use core::num;

use conveyoros_oas_lib::db::garment_repo;


#[test]
pub fn test_create_garment() {
    use conveyoros_oas_lib::{db::connection::establish_connection, model::NewGarment};
    let item_id = "GARMENT123";
    let invoice_comments = Some("Test comments".to_owned());
    let item_description = Some("Test garment description".to_owned());
    let display_invoice_number = Some("INV123".to_owned());
    let full_invoice_number = "FULLINV123".to_owned();
    let invoice_dropoff_date = chrono::NaiveDate::from_ymd_opt(
        2024,
        6,
        1,
    ).unwrap()
    .and_hms_opt(10, 0, 0).unwrap();
    let invoice_pickup_date = chrono::NaiveDate::from_ymd_opt(
        2024,
        6, 5,
    ).unwrap()
    .and_hms_opt(15, 0, 0).unwrap();
    let slot_number = 5; 
    let new_garment = NewGarment {
        item_id: item_id.to_owned(),
        invoice_comments: invoice_comments.unwrap_or_default(),
        item_description: item_description.unwrap_or_default(),
        display_invoice_number: display_invoice_number.unwrap_or_default(),
        full_invoice_number: full_invoice_number.to_owned(),
        invoice_dropoff_date,
        invoice_pickup_date,
        slot_number,
    };

} // end of test_create_garment