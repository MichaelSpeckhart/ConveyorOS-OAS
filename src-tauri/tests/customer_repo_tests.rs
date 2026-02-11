use core::num;

use conveyoros_oas_lib::db::customer_repo;


#[test]
pub fn test_add_customer() {
    use conveyoros_oas_lib::{db::connection::establish_connection, model::NewCustomer};


    let mut first_name: &str = "Alex";
    let mut last_name: &str = "Yuan";
    let mut identifier: &str = "21738219738";
    let mut phone_number: &str = "201-715-0525";

    let new_customer = NewCustomer {
        first_name: first_name.to_owned(),
        last_name: last_name.to_owned(),
        customer_identifier: identifier.to_owned(),
        phone_number: phone_number.to_owned()
    };

    let mut conn = establish_connection();

    let result = customer_repo::create_customer(
        conn.as_mut().expect("Failed to establish connection"),
        new_customer
    );

    match result {
        Ok(customer) => {
            assert_eq!(customer.first_name, first_name);
            assert_eq!(customer.last_name, last_name);
            assert_eq!(customer.customer_identifier, identifier);
            assert_eq!(customer.phone_number, phone_number);
        },
        Err(e) => panic!("Failed to create customer: {}", e),
    }

}


#[test]
pub fn test_delete_customer_success() {
    use conveyoros_oas_lib::{db::connection::establish_connection, model::NewCustomer};
    
    let mut conn = establish_connection().expect("Failed to establish connection");

    // Delete the customer given the identifier

    let num_deleted = customer_repo::delete_customer(&mut conn, "1234");

    assert!(num_deleted.is_ok());

}

#[test]
pub fn test_delete_customer_failure() {
    use conveyoros_oas_lib::{db::connection::establish_connection};
    let mut conn = establish_connection().expect("Failed to establish connection");

    let num_deleted = customer_repo::delete_customer(&mut conn, "identifier_to_delete");

    assert!(num_deleted.is_err());
}

#[test]
pub fn test_contains_customer_success() {
    use conveyoros_oas_lib::{db::connection::establish_connection};
    let mut conn = establish_connection().expect("Failed to establish connection");

    let customer = customer_repo::contains_customer_identifier(&mut conn, "123456");

    assert!(customer == true);
}

#[test]
pub fn test_get_customer_success() {
    use conveyoros_oas_lib::{db::connection::establish_connection};
    let mut conn = establish_connection().expect("Failed to establish connection");

    let customer = customer_repo::get_customer_by_identifier(&mut conn, "123456");

    assert!(customer.is_ok());

    let customer_info = customer.unwrap();

    assert!(customer_info.first_name == "Michael");
    assert!(customer_info.last_name == "Speckhart");
    assert!(customer_info.phone_number == "973-507-6394");
    assert!(customer_info.customer_identifier == "123456");

    println!("Customer Information: \n{:#?}", customer_info);
}