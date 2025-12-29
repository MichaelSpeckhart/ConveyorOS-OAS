use core::num;

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

use crate::establish_connection;
use crate::model::{Customer, NewCustomer};
use crate::schema::{customers, garments};
use crate::schema::customers::dsl::*;


pub fn count_customers(conn: &mut PgConnection) -> QueryResult<i64> {
    customers::table.count().get_result(conn)
}

pub fn create_customer(
    conn: &mut PgConnection,
    new_customer: NewCustomer
) -> QueryResult<Customer> {
    diesel::insert_into(customers::table)
        .values(new_customer)
        .get_result(conn)
}

pub fn delete_customer(conn: &mut PgConnection, identifier_to_delete: &str) -> Result<(), String> {
    let deleted = diesel::delete(customers.filter(customer_identifier.eq(identifier_to_delete)))
        .execute(conn).map_err(|e| e.to_string())?;

    if deleted == 0 {
        Err("Customer not found".to_string())
    } else {
        Ok(())
    }
}

pub fn contains_customer_identifier(conn: &mut PgConnection, identifier: &str) -> bool {
    customers
        .filter(customer_identifier.eq(identifier))
        .select(customer_identifier)
        .first::<String>(conn)
        .is_ok()            
}

pub fn get_customer_by_identifier(conn: &mut PgConnection, identifier: &str) -> Result<Customer, String> {
    customers
        .filter(customer_identifier.eq(identifier))
        .first::<Customer>(conn)
        .map_err(|e| e.to_string())
}