use chrono::{NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use std::{fmt, str::FromStr};

// WinCleaners Operations
const TICKETCOMPLETE: &str = "TICKETCOMPLETE";
const GARMENTREMOVED: &str = "GARMENTREMOVED";

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum TicketCompleteErrors {}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum GarmentRemovedErrors {}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum WinCleanersConveyorOpTypes {
    TicketComplete,
    GarmentRemoved,
}

impl fmt::Display for WinCleanersConveyorOpTypes {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WinCleanersConveyorOpTypes::TicketComplete => write!(f, "{TICKETCOMPLETE}"),
            WinCleanersConveyorOpTypes::GarmentRemoved => write!(f, "{GARMENTREMOVED}"),
        }
    }
}

impl FromStr for WinCleanersConveyorOpTypes {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_uppercase().as_str() {
            TICKETCOMPLETE => Ok(WinCleanersConveyorOpTypes::TicketComplete),
            GARMENTREMOVED => Ok(WinCleanersConveyorOpTypes::GarmentRemoved),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct TicketCompleteOp {
    pub op_type: WinCleanersConveyorOpTypes,
    pub customer_id: String,
    pub garnent_number: String,
    pub employee_number: String,
    pub conveyor_id: String,
    pub loadstation_id: String,
    pub slot_number: u32,
    pub transaction_date: NaiveDate,
    pub transaction_time: NaiveTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct GarmentRemovedOp {
    pub op_type: WinCleanersConveyorOpTypes,
    pub customer_id: String,
    pub garnent_number: String,
    pub employee_number: String,
    pub conveyor_id: String,
    pub loadstation_id: String,
    pub slot_number: u32,
    pub transaction_date: NaiveDate,
    pub transaction_time: NaiveTime,
}

/// SPOT Operations
const LOADINVOICE: &str = "LOADINV";
const UNLOADINVOICE: &str = "UNLOADINV";
const SPLITINVOICE: &str = "SPLITINV";
const PRINTINVOICE: &str = "PRINTINV";
const LOADITEM: &str = "LOADITEM";
const UNLOADITEM: &str = "UNLOADITEM";

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum LoadItemErrors {}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum UnloadItemErrors {}

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
            ConveyorOpsTypes::PrintInvoice => write!(f, "{PRINTINVOICE}"),
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
