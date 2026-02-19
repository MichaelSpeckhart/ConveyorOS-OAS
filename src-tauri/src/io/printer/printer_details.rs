use escpos_rs::{Printer, PrinterProfile, command::Command};

use crate::model::Ticket;

pub fn connect_printer() -> Result<PrinterProfile, ()> {
    let printer_details = PrinterProfile::usb_builder(0x04b8, 0x0202).build();
    return Ok(printer_details);
}

pub fn print_text(text: String, printer_details: PrinterProfile) {
    let printer = match Printer::new(printer_details) {
        Ok(maybe_printer) => match maybe_printer {
            Some(printer) => printer,
            None => panic!("No printer was found :("),
        },
        Err(e) => panic!("Error: {}", e),
    };

    match printer.println(text) {
        Ok(_) => (),
        Err(e) => println!("Error: {}", e),
    }
}

pub fn print_ticket(ticket_info: &Ticket) {
    let printer_details = PrinterProfile::usb_builder(0x04b8, 0x0202).build();

    let printer = match Printer::new(printer_details) {
        Ok(maybe_printer) => match maybe_printer {
            Some(printer) => printer,
            None => {
                eprintln!("No printer was found");
                return;
            }
        },
        Err(e) => {
            eprintln!("Error connecting to printer: {}", e);
            return;
        }
    };

    let sep  = "--------------------------------";
    let dsep = "================================";

    macro_rules! send {
        ($e:expr) => {
            if let Err(e) = $e {
                eprintln!("Printer error: {}", e);
                return;
            }
        };
    }

    // Center align all text (ESC a 1)
    send!(printer.raw(&[0x1b, 0x61, 0x01]));

    // ── Header ───────────────────────────────────────────────────────────
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(dsep));
    send!(printer.println("CONVEYOR CLEANERS"));
    send!(printer.println(dsep));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    // ── Invoice info ──────────────────────────────────────────────────────
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(format!("Invoice: #{}", ticket_info.display_invoice_number)));
    send!(printer.raw(&Command::BoldOff.as_bytes()));
    send!(printer.println(format!(
        "Drop-off: {}",
        ticket_info.invoice_dropoff_date.format("%m/%d/%Y")
    )));
    send!(printer.println(format!(
        "Pick-up:  {}",
        ticket_info.invoice_pickup_date.format("%m/%d/%Y")
    )));
    send!(printer.println(sep));

    // ── Customer ──────────────────────────────────────────────────────────
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println("CUSTOMER"));
    send!(printer.raw(&Command::BoldOff.as_bytes()));
    send!(printer.println(format!(
        "{} {}",
        ticket_info.customer_first_name, ticket_info.customer_last_name
    )));
    send!(printer.println(ticket_info.customer_phone_number.clone()));
    send!(printer.println(sep));

    // ── Order details ─────────────────────────────────────────────────────
    send!(printer.println(format!("Items:     {}", ticket_info.number_of_items)));
    send!(printer.println(format!(
        "Processed: {}/{}",
        ticket_info.garments_processed, ticket_info.number_of_items
    )));
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(format!(
        "Status:    {}",
        ticket_info.ticket_status.to_uppercase()
    )));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    // ── Footer ────────────────────────────────────────────────────────────
    send!(printer.raw(&Command::BoldOn.as_bytes()));
    send!(printer.println(dsep));
    send!(printer.println("THANK YOU!"));
    send!(printer.println(dsep));
    send!(printer.raw(&Command::BoldOff.as_bytes()));

    // Feed and cut
    send!(printer.raw(&[b'\n', b'\n', b'\n']));
    send!(printer.cut());
}
