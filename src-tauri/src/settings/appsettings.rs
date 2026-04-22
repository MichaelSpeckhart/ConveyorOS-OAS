use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldMappings {
    pub customer_identifier: u32,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_first_name: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_last_name: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_phone: Option<u32>,
    pub full_invoice_number: u32,
    pub display_invoice_number: u32,
    pub num_items: u32,
    pub slot_occupancy: u32,
    pub item_id: u32,
    pub item_description: u32,
    pub dropoff_date: u32,
    pub pickup_date: u32,
    pub comments: u32,
}

impl Default for FieldMappings {
    fn default() -> Self {
        // SPOT defaults
        Self {
            customer_identifier: 6,
            customer_first_name: Some(8),
            customer_last_name: Some(7),
            customer_phone: Some(9),
            full_invoice_number: 1,
            display_invoice_number: 2,
            num_items: 3,
            slot_occupancy: 4,
            item_id: 10,
            item_description: 11,
            dropoff_date: 12,
            pickup_date: 13,
            comments: 14,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketField {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub show_barcode: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketTemplateConfig {
    pub header_text: String,
    pub footer_text: String,
    pub fields: Vec<TicketField>,
}

impl Default for TicketTemplateConfig {
    fn default() -> Self {
        Self {
            header_text: String::new(),
            footer_text: String::new(),
            fields: vec![
                TicketField { id: "ticketNumber".into(),       label: "Ticket Number".into(),    enabled: true,  show_barcode: Some(true)  },
                TicketField { id: "customerIdentifier".into(), label: "Customer ID".into(),      enabled: true,  show_barcode: None         },
                TicketField { id: "customerName".into(),       label: "Customer Name".into(),    enabled: true,  show_barcode: None         },
                TicketField { id: "numItems".into(),           label: "Number of Items".into(),  enabled: true,  show_barcode: None         },
                TicketField { id: "dropoffDate".into(),        label: "Drop-off Date".into(),    enabled: true,  show_barcode: None         },
                TicketField { id: "pickupDate".into(),         label: "Pickup Date".into(),      enabled: true,  show_barcode: None         },
                TicketField { id: "comments".into(),           label: "Notes / Comments".into(), enabled: false, show_barcode: None         },
                TicketField { id: "itemList".into(),           label: "Garment List".into(),     enabled: true,  show_barcode: Some(false)  },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterSettings {
    pub connection_type: String,
    pub selected_printer: String,
    pub port_path: String,
    #[serde(default = "default_paper_size")]
    pub paper_size: String,
    #[serde(default = "default_orientation")]
    pub orientation: String,
    #[serde(default = "default_quality")]
    pub quality: String,
    #[serde(default = "default_copies")]
    pub copies: u32,
    #[serde(default = "default_color_mode")]
    pub color_mode: String,
    pub ticket_template: TicketTemplateConfig,
}

fn default_paper_size() -> String { "Letter".to_string() }
fn default_orientation() -> String { "portrait".to_string() }
fn default_quality() -> String { "normal".to_string() }
fn default_copies() -> u32 { 1 }
fn default_color_mode() -> String { "grayscale".to_string() }

impl Default for PrinterSettings {
    fn default() -> Self {
        Self {
            connection_type: "system".to_string(),
            selected_printer: String::new(),
            port_path: String::new(),
            paper_size: default_paper_size(),
            orientation: default_orientation(),
            quality: default_quality(),
            copies: default_copies(),
            color_mode: default_color_mode(),
            ticket_template: TicketTemplateConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct AppSettings {
    pub posCsvDir: String,
    pub conveyorCsvOutputDir: String,
    pub dbHost: String,
    pub dbPort: u16,
    pub dbName: String,
    pub dbUser: String,
    pub dbPassword: String,
    pub opcServerUrl: String,
    #[serde(default = "default_pos_system")]
    pub posSystem: String,
    #[serde(default)]
    pub fieldMappings: FieldMappings,
    #[serde(default)]
    pub printer: PrinterSettings,
}

fn default_pos_system() -> String {
    "spot".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            posCsvDir: String::new(),
            conveyorCsvOutputDir: String::new(),
            dbHost: "localhost".to_string(),
            dbPort: 5432,
            dbName: "conveyor-app".to_string(),
            dbUser: "postgres".to_string(),
            dbPassword: "postgres123".to_string(),
            opcServerUrl: "opc.tcp://localhost:4840".to_string(),
            posSystem: "spot".to_string(),
            fieldMappings: FieldMappings::default(),
            printer: PrinterSettings::default(),
        }
    }
}
