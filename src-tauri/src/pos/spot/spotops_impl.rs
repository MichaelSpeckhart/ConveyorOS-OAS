use std::string;

use crate::db::connection::establish_connection;
use crate::pos::spot::spotops_types::{self, add_item_errors, add_item_op, delete_item_errors, delete_item_op, spot_ops_types};

use crate::db::{self, garment_repo};

impl spotops_types::add_item_op {

    pub fn perform_add_item_op(operation: &add_item_op) -> Result<String, String> {
        
        let mut conn: diesel::PgConnection = establish_connection();          


        Ok("Add Item Operation Successful".to_string())
    }

    pub fn create_add_item_op(
        full_invoice_number: &str,
        invoice_number: &str,
        num_items: u32,
        slot_occupancy: u32,
        invoice_balance_due: f32,
        customer_identifier: &str,
        customer_first_name: &str,
        customer_last_name: &str,
        customer_phone_number: &str,
        item_id: &str,
        item_descriptions: &str,
        invoice_dropoff_date: chrono::DateTime<chrono::Local>,
        invoice_promised_date: chrono::DateTime<chrono::Local>,
        invoice_comments: &str
    ) -> Result<add_item_op, add_item_errors> {

        println!("Creating Add Item Operation for invoice: {}", full_invoice_number);

        if full_invoice_number.trim().is_empty() {
            return Err(add_item_errors::EmptyField { field: "full_invoice_number" });
        }
        if invoice_number.trim().is_empty() {
            return Err(add_item_errors::EmptyField { field: "invoice_number" });
        }
        if item_id.trim().is_empty() {
            return Err(add_item_errors::EmptyField { field: "item_id" });
        }
        if item_descriptions.trim().is_empty() {
            return Err(add_item_errors::EmptyField { field: "item_descriptions" });
        }

        println!("Creating Add Item Operation for invoice: {}", full_invoice_number);

        Ok(add_item_op {
            op_type: spot_ops_types::AddItem,
            full_invoice_number: full_invoice_number.to_string(),
            invoice_number: invoice_number.to_string(),
            num_items,
            slot_occupancy,
            invoice_balance_due,
            customer_identifier: customer_identifier.to_string(),
            customer_first_name: customer_first_name.to_string(),
            customer_last_name: customer_last_name.to_string(),
            customer_phone_number: customer_phone_number.to_string(),
            item_id: item_id.to_string(),
            item_descriptions: item_descriptions.to_string(),
            invoice_dropoff_date,
            invoice_promised_date,
            invoice_comments: invoice_comments.to_string()
        })
    }

    
    

}


impl spotops_types::delete_item_op {
   
   // Delete operation will remove the associated garment from the database
    pub fn create_delete_item_op(full_invoice_number: &str, item_id: &str) -> Result<delete_item_op, delete_item_errors> {
        if full_invoice_number.trim().is_empty() {
            return Err(delete_item_errors::EmptyField { field: "full_invoice_number" });
        }

        if item_id.trim().is_empty() {
            return Err(delete_item_errors::EmptyField { field: "item_id" });
        }

        Ok(delete_item_op { op_type: spot_ops_types::DeleteItem, full_invoice_number: full_invoice_number.to_string(), item_id: item_id.to_string() })
        
    }


}
