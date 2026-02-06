use std::{fmt, str::FromStr};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Local};

use crate::pos::spot;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]

pub enum add_item_errors {
    EmptyField { field: &'static str },
    InvalidValue { field: &'static str, reason: &'static str },
}

pub enum delete_item_errors {
    EmptyField { field: &'static str },
    InvalidValue { field: &'static str, reason: &'static str },
}

impl fmt::Display for add_item_errors {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            add_item_errors::EmptyField { field } => write!(f, "Empty field: {}", field),
            add_item_errors::InvalidValue { field, reason } => {
                write!(f, "Invalid value in field {}: {}", field, reason)
            }
        }
    }
}

impl fmt::Display for delete_item_errors {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            delete_item_errors::EmptyField { field } => write!(f, "Empty field: {}", field),
            delete_item_errors::InvalidValue { field, reason } => {
                write!(f, "Invalid value in field {}: {}", field, reason)
            }
        }
    }
}

// Assembly Conveyor SPOT operations for adding and deleting items
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum spot_ops_types {
    AddItem,
    DeleteItem,
    AddInvoice,
    DeleteInvoice,
    Default
}

impl fmt::Display for spot_ops_types {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            spot_ops_types::AddItem => write!(f, "ADDITEM"), 
            spot_ops_types::DeleteItem => write!(f, "DELITEM"), 
            spot_ops_types::AddInvoice => write!(f, "ADDINV"),
            spot_ops_types::DeleteInvoice => write!(f, "DELINV"),
            spot_ops_types::Default => write!(f, "UNSUPPORTED")
        }
    }
}


impl FromStr for spot_ops_types {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_uppercase().as_str() {
            "ADDITEM" => Ok(spot_ops_types::AddItem),
            "DELITEM" => Ok(spot_ops_types::DeleteItem),
            _ => Ok(spot_ops_types::Default),
        }
    }
}


#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AddItemOp {
    pub op_type: spot_ops_types,
    pub full_invoice_number: String,
    pub invoice_number: String,
    pub num_items: u32,
    pub slot_occupancy: u32,
    pub invoice_balance_due: f32,
    pub customer_identifier: String,
    pub customer_first_name: String,
    pub customer_last_name: String,
    pub customer_phone_number: String,
    pub item_id: String,
    pub item_descriptions: String,
    pub invoice_dropoff_date: DateTime<Local>,
    pub invoice_promised_date: DateTime<Local>,
    pub invoice_comments: String
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct delete_item_op {
    pub op_type: spot_ops_types,
    pub full_invoice_number: String,
    pub item_id: String
}


/// Add Invoice Operation 
/// Defined in Xplor SPOT Conveyor CSV Documentation.
/// Add or update invoice in Conveyor database
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AddInvoiceOp {
    pub op_type: spot_ops_types,
    pub full_invoice_number: String,
    pub display_invoice_number: String,
    pub num_items: u32,
    pub slot_occupancy: u32,
    pub invoice_balance_due: f32,
    pub customer_identifier: String,
    pub customer_first_name: String,
    pub customer_last_name: String,
    pub customer_phone_number: String,
    pub customer_pin: String
}

/// Delete Invoice Operation
/// Defined in Xplor SPOT Conveyor CSV Documentation.
/// Delete invoice from Conveyor database
/// If the Invoice is currently loaded, the
/// conveyor should unload it and provide a conveyor.csv with UNLOADINV Op Type as
/// feedback.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[repr(align(64))]
pub struct DeleteInvoiceOp {
    pub op_type: spot_ops_types,
    pub full_invoice_number: String,
    pub unload_point_number: String,
}

