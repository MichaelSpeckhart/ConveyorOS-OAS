use std::io::Write;
use escpos_rs::{Printer, PrinterProfile, command::Command};

use crate::{
    model::Ticket,
    settings::appsettings::{PrinterSettings, TicketTemplateConfig},
};

// ── Connection ────────────────────────────────────────────────────────────────

fn open_usb_port(port_path: &str) -> Result<std::fs::File, String> {
    std::fs::OpenOptions::new()
        .write(true)
        .open(port_path)
        .map_err(|e| format!("Cannot open USB port {}: {}", port_path, e))
}

// ── Ticket printing ───────────────────────────────────────────────────────────

pub fn print_ticket(ticket: &Ticket, printer_settings: &PrinterSettings) {
    if printer_settings.connection_type == "usb" && !printer_settings.port_path.is_empty() {
        if let Err(e) = print_ticket_usb(ticket, &printer_settings.port_path, &printer_settings.ticket_template) {
            eprintln!("USB print error: {}", e);
        }
    } else {
        print_ticket_legacy(ticket);
    }
}

fn print_ticket_usb(ticket: &Ticket, port_path: &str, template: &TicketTemplateConfig) -> Result<(), String> {
    let mut port = open_usb_port(port_path)?;
    let mut buf: Vec<u8> = Vec::new();

    // Initialize printer
    buf.extend_from_slice(&[0x1b, 0x40]);

    let sep  = "--------------------------------";
    let dsep = "================================";

    macro_rules! center   { () => { buf.extend_from_slice(&[0x1b, 0x61, 0x01]); } }
    macro_rules! left     { () => { buf.extend_from_slice(&[0x1b, 0x61, 0x00]); } }
    macro_rules! bold_on  { () => { buf.extend_from_slice(&[0x1b, 0x45, 0x01]); } }
    macro_rules! bold_off { () => { buf.extend_from_slice(&[0x1b, 0x45, 0x00]); } }
    macro_rules! line     { ($s:expr) => { buf.extend_from_slice(format!("{}\n", $s).as_bytes()); } }

    // Header text
    if !template.header_text.is_empty() {
        center!();
        bold_on!();
        line!(dsep);
        line!(template.header_text.to_uppercase());
        line!(dsep);
        bold_off!();
    }

    left!();

    for field in template.fields.iter().filter(|f| f.enabled) {
        match field.id.as_str() {
            "ticketNumber" => {
                bold_on!();
                line!(format!("Ticket: #{}", ticket.display_invoice_number));
                bold_off!();
                if field.show_barcode == Some(true) {
                    // Code128 barcode: GS k 73 <len> <data>
                    let data = ticket.display_invoice_number.as_bytes();
                    buf.extend_from_slice(&[0x1d, 0x6b, 0x49, data.len() as u8]);
                    buf.extend_from_slice(data);
                    buf.push(b'\n');
                }
            }
            "customerIdentifier" => {
                line!(format!("Customer ID: {}", ticket.customer_identifier));
            }
            "customerName" => {
                let name = format!("{} {}", ticket.customer_first_name, ticket.customer_last_name).trim().to_string();
                if !name.is_empty() {
                    line!(format!("Name: {}", name));
                }
            }
            "numItems" => {
                line!(format!("Items: {}", ticket.number_of_items));
            }
            "dropoffDate" => {
                line!(format!("Drop-off: {}", ticket.invoice_dropoff_date.format("%m/%d/%Y")));
            }
            "pickupDate" => {
                line!(format!("Pick-up:  {}", ticket.invoice_pickup_date.format("%m/%d/%Y")));
            }
            "comments" => {
                // Comments live on the garment; skip at ticket level if empty placeholder
            }
            _ => {}
        }
    }

    line!(sep);

    // Footer text
    if !template.footer_text.is_empty() {
        center!();
        line!(template.footer_text);
        left!();
    }

    // Feed and cut
    buf.extend_from_slice(&[b'\n', b'\n', b'\n']);
    buf.extend_from_slice(&[0x1d, 0x56, 0x41, 0x03]); // full cut

    port.write_all(&buf).map_err(|e| format!("Write error: {}", e))?;
    port.flush().map_err(|e| format!("Flush error: {}", e))
}

// Legacy path: hardcoded USB VID/PID (kept for backwards compatibility)
fn print_ticket_legacy(ticket_info: &Ticket) {
    let printer_details = PrinterProfile::usb_builder(0x04b8, 0x0202).build();

    let printer = match Printer::new(printer_details) {
        Ok(Some(p)) => p,
        Ok(None) => { eprintln!("No printer was found"); return; }
        Err(e)    => { eprintln!("Error connecting to printer: {}", e); return; }
    };

    let sep  = "--------------------------------";
    let dsep = "================================";

    macro_rules! send {
        ($e:expr) => { if let Err(e) = $e { eprintln!("Printer error: {}", e); return; } };
    }

    send!(printer.raw(&[0x1b, 0x61, 0x01]));
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(dsep));
    send!(printer.println("CONVEYOR CLEANERS"));
    send!(printer.println(dsep));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(format!("Invoice: #{}", ticket_info.display_invoice_number)));
    send!(printer.raw(&Command::BoldOff.as_bytes()));
    send!(printer.println(format!("Drop-off: {}", ticket_info.invoice_dropoff_date.format("%m/%d/%Y"))));
    send!(printer.println(format!("Pick-up:  {}", ticket_info.invoice_pickup_date.format("%m/%d/%Y"))));
    send!(printer.println(sep));

    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println("CUSTOMER"));
    send!(printer.raw(&Command::BoldOff.as_bytes()));
    send!(printer.println(format!("{} {}", ticket_info.customer_first_name, ticket_info.customer_last_name)));
    send!(printer.println(ticket_info.customer_phone_number.clone()));
    send!(printer.println(sep));

    send!(printer.println(format!("Items:     {}", ticket_info.number_of_items)));
    send!(printer.println(format!("Processed: {}/{}", ticket_info.garments_processed, ticket_info.number_of_items)));
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(format!("Status:    {}", ticket_info.ticket_status.to_uppercase())));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(dsep));
    send!(printer.println("THANK YOU!"));
    send!(printer.println(dsep));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    send!(printer.raw(&[b'\n', b'\n', b'\n']));
    send!(printer.cut());
}
