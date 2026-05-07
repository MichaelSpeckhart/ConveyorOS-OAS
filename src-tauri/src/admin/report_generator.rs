use crate::{db::{conveyor_activity_repo, customer_repo}, model::{ConveyorActivity, Customer}};

pub fn generate_customer_report() -> Result<Vec<Customer>, String> {
    let mut conn = crate::db::connection::establish_connection()?;
    customer_repo::get_all_customers(&mut conn).map_err(|e| e.to_string())
}

pub fn generate_customer_report_by_id() -> Result<Vec<Customer>, String> {
    let mut conn = crate::db::connection::establish_connection()?;
    customer_repo::get_all_customers(&mut conn)
        .map_err(|e| e.to_string())
}

// pub fn generate_conveyor_inventory_report() -> Result<Vec<


pub fn generate_conveyor_activity_report() -> Result<Vec<ConveyorActivity>, String> {
    let mut conn = crate::db::connection::establish_connection()?;
    conveyor_activity_repo::get_all_conveyor_activity(&mut conn)
        .map_err(|e| e.to_string())
}