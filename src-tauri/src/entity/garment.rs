use serde::{Serialize, Deserialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Garment {
    pub id: u32,
    pub invoice_number: String,
    pub description: String,
    pub quantity: u32,

}

impl Garment {

    // Constructor for garment
    pub fn new(id: u32, invoice_number: String, description: String, quantity: u32) -> Garment {
        Garment {
            id,
            invoice_number,
            description,
            quantity
        }
    }


}