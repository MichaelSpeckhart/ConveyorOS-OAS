use conveyoros_oas_lib::{db::{connection::establish_connection, ticket_repo}, io::printer::{self, printer_details}};

#[test]
pub fn test_simple_print() {
    let printer_details = printer_details::connect_printer();

    assert!(printer_details.is_err() == false);

     use conveyoros_oas_lib::db::connection::set_database_url;

    set_database_url("postgres://postgres:postgres123@localhost:5432/conveyor-app");

    let mut conn = establish_connection().unwrap();

    let ticket_info = ticket_repo::get_ticket_by_invoice_number(&mut conn, ".DCDC03-090374");

    printer_details::print_ticket(&ticket_info.unwrap());
}