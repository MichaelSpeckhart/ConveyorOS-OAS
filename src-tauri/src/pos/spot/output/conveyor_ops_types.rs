use std::{fmt, str::FromStr};
use serde::{Deserialize, Serialize};

const LOADINVOICE: &str = "LOADINV";
const UNLOADINVOICE: &str = "UNLOADINV";
const SPLITINVOICE: &str = "SPLITINV";
const PRINTINVOICE: &str = "PRINTINV";
const LOADITEM: &str = "LOADITEM";
const UNLOADITEM: &str = "UNLOADITEM";

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum LoadItemErrors {
    
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum UnloadItemErrors {

}


/// Assembly Conveyor -> SPOT POS 
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum ConveyorOpsTypes {
    LoadItem,
    UnloadItem,
    LoadInvoice,
    UnloadInvoice,
    SplitInvoice,
    PrintInvoice,
}

impl fmt::Display for ConveyorOpsTypes {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ConveyorOpsTypes::LoadItem => write!(f, "{LOADITEM}"),
            ConveyorOpsTypes::UnloadItem => write!(f, "{UNLOADITEM}"),
            ConveyorOpsTypes::LoadInvoice => write!(f, "{LOADINVOICE}"),
            ConveyorOpsTypes::UnloadInvoice => write!(f, "{UNLOADINVOICE}"),
            ConveyorOpsTypes::SplitInvoice => write!(f, "{SPLITINVOICE}"),
            ConveyorOpsTypes::PrintInvoice => write!(f, "{PRINTINVOICE}")
        }
    }
}

impl FromStr for ConveyorOpsTypes {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_uppercase().as_str() {
            LOADITEM => Ok(ConveyorOpsTypes::LoadItem),
            UNLOADITEM => Ok(ConveyorOpsTypes::UnloadItem),
            LOADINVOICE => Ok(ConveyorOpsTypes::LoadInvoice),
            UNLOADINVOICE => Ok(ConveyorOpsTypes::UnloadInvoice),
            SPLITINVOICE => Ok(ConveyorOpsTypes::SplitInvoice),
            PRINTINVOICE => Ok(ConveyorOpsTypes::PrintInvoice),
            _ => Err(()),
        }
    }
}

// Conveyor SPOT Operations
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct LoadItemOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub item_id: String,
    pub slot_number: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct UnloadItemOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub item_id: String,
    pub slot_number: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct LoadInvoiceOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub slot_number: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct UnloadInvoiceOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub slot_number: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SplitInvoiceOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub item_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct PrintInvoiceOp {
    pub op_type: ConveyorOpsTypes,
    pub full_invoice_number: String,
    pub print_number: u32,
}

