use core::num;

use conveyoros_oas_lib::db::ticket_repo;

#[test]
pub fn test_update_ticket() {
    use conveyoros_oas_lib::{db::connection::establish_connection, model::UpdateTicket};

    let mut conn = establish_connection();
    let ticket_id = 1; // Replace with a valid ticket ID from your test database
    // let updated_ticket = UpdateTicket {
    //     full_invoice_number: "  ",
    //     display_invoice_number: "  ",
    //     garments_processed: Some(5),
    //     invoice_pickup_date: None,
    // };
    
}