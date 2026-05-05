use crate::{db::customer_repo, model::Customer};

pub fn generate_customer_report() -> Result<Vec<Customer>, String> {
    let mut conn = crate::db::connection::establish_connection()?;
    customer_repo::get_all_customers(&mut conn).map_err(|e| e.to_string())
}

pub fn generate_customer_report_by_id() -> Result<Vec<Customer>, String> {
    let mut conn = crate::db::connection::establish_connection()?;
    customer_repo::get_all_customers(&mut conn).map_err(|e| e.to_string())
}

// pub fn generate_conveyor_inventory_report() -> Result<Vec<


