use escpos_rs::{Printer, PrinterProfile, command::Command};

use crate::{
    model::{Garment, Ticket},
    settings::appsettings::{PrinterSettings, TicketTemplateConfig},
};

// ── ESC/POS buffer builder ────────────────────────────────────────────────────

pub fn ticket_to_vector(ticket: &Ticket, garments: &[Garment], template: &TicketTemplateConfig) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();

    // Initialize
    buf.extend_from_slice(&[0x1B, 0x40]);
    buf.push(0x0A);

    // Center, bold, double-height for header
    buf.extend_from_slice(&[0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x10]);
    if !template.header_text.is_empty() {
        buf.extend_from_slice(template.header_text.as_bytes());
        buf.push(0x0A);
    }
    // Reset size and bold
    buf.extend_from_slice(&[0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00]);
    buf.extend_from_slice(b"--------------------------------\n");

    // Left-align for fields
    buf.extend_from_slice(&[0x1B, 0x61, 0x00]);

    for field in &template.fields {
        if !field.enabled {
            continue;
        }
        let show_barcode = field.show_barcode.unwrap_or(false);

        match field.id.as_str() {
            "ticketNumber" => {
                let value = &ticket.display_invoice_number;
                let line = format!("{}: {}\n", field.label, value);
                buf.extend_from_slice(line.as_bytes());
                if show_barcode {
                    // Center, HRI below, height 60, width 2
                    buf.extend_from_slice(&[0x1B, 0x61, 0x01, 0x1D, 0x48, 0x02, 0x1D, 0x68, 60, 0x1D, 0x77, 2]);
                    // Code128: GS k 73 <len> {B<data>
                    let code128_data = format!("{{B{}", value);
                    let data_bytes = code128_data.as_bytes();
                    buf.extend_from_slice(&[0x1D, 0x6B, 73, data_bytes.len() as u8]);
                    buf.extend_from_slice(data_bytes);
                    buf.push(0x0A);
                    buf.extend_from_slice(&[0x1B, 0x61, 0x00]);
                }
            }
            "customerIdentifier" => {
                let line = format!("{}: {}\n", field.label, ticket.customer_identifier);
                buf.extend_from_slice(line.as_bytes());
            }
            "customerName" => {
                let name = format!("{} {}", ticket.customer_first_name, ticket.customer_last_name);
                let name = name.trim();
                if !name.is_empty() {
                    let line = format!("{}: {}\n", field.label, name);
                    buf.extend_from_slice(line.as_bytes());
                }
            }
            "numItems" => {
                let line = format!("{}: {} items\n", field.label, ticket.number_of_items);
                buf.extend_from_slice(line.as_bytes());
            }
            "dropoffDate" => {
                let line = format!("{}: {}\n", field.label, ticket.invoice_dropoff_date.format("%m/%d/%Y"));
                buf.extend_from_slice(line.as_bytes());
            }
            "pickupDate" => {
                let line = format!("{}: {}\n", field.label, ticket.invoice_pickup_date.format("%m/%d/%Y"));
                buf.extend_from_slice(line.as_bytes());
            }
            "comments" => {
                // Take the first non-empty comment from any garment on this ticket
                let comment = garments.iter()
                    .find(|g| !g.invoice_comments.is_empty())
                    .map(|g| g.invoice_comments.as_str())
                    .unwrap_or("");
                if !comment.is_empty() {
                    let line = format!("{}: {}\n", field.label, comment);
                    buf.extend_from_slice(line.as_bytes());
                }
            }
            "itemList" => {
                buf.extend_from_slice(b"-- Garments --\n");
                for g in garments {
                    let line = format!("{}  {}\n", g.item_id, g.item_description);
                    buf.extend_from_slice(line.as_bytes());
                }
            }
            _ => {}
        }
    }

    buf.extend_from_slice(b"--------------------------------\n");

    if !template.footer_text.is_empty() {
        buf.extend_from_slice(&[0x1B, 0x61, 0x01]);
        buf.extend_from_slice(template.footer_text.as_bytes());
        buf.push(0x0A);
        buf.extend_from_slice(&[0x1B, 0x61, 0x00]);
    }

    // Feed 4 lines then partial cut
    buf.extend_from_slice(&[0x0A, 0x0A, 0x0A, 0x0A]);
    buf.extend_from_slice(&[0x1D, 0x56, 0x42, 0x03]);

    buf
}

// ── Routing ───────────────────────────────────────────────────────────────────

pub fn print_ticket(ticket: &Ticket, garments: &[Garment], printer_settings: &PrinterSettings) -> Result<(), String> {
    let data = ticket_to_vector(ticket, garments, &printer_settings.ticket_template);
    if printer_settings.connection_type == "usb" && !printer_settings.port_path.is_empty() {
        _send_escpos(&printer_settings.port_path, &data)
    } else {
        print_ticket_legacy(ticket);
        Ok(())
    }
}

fn parse_vid_pid(s: &str) -> Result<(u16, u16), String> {
    let parts: Vec<&str> = s.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err(format!("Expected VID:PID format (e.g. 04b8:0202), got: {s}"));
    }
    let vid = u16::from_str_radix(parts[0].trim(), 16)
        .map_err(|_| format!("Invalid vendor ID: {}", parts[0]))?;
    let pid = u16::from_str_radix(parts[1].trim(), 16)
        .map_err(|_| format!("Invalid product ID: {}", parts[1]))?;
    Ok((vid, pid))
}

fn looks_like_ip(s: &str) -> bool {
    let host = s.splitn(2, ':').next().unwrap_or(s);
    let parts: Vec<&str> = host.split('.').collect();
    parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok())
}

fn _send_escpos(port_path: &str, data: &[u8]) -> Result<(), String> {
    use std::io::Write;

    // VID:PID hex (e.g. "04b8:0202") → direct USB via escpos_rs
    if let Ok((vid, pid)) = parse_vid_pid(port_path) {
        use escpos_rs::{Printer, PrinterProfile};
        let profile = PrinterProfile::usb_builder(vid, pid).build();
        let printer = Printer::new(profile)
            .map_err(|e| format!("Failed to connect to printer: {e}"))?
            .ok_or_else(|| format!("Printer {port_path} not found on USB. Make sure it is connected and powered on."))?;
        return printer.raw(data).map_err(|e| format!("Failed to send data to printer: {e}"));
    }

    // IP address → TCP port 9100 (Epson/Star raw printing standard)
    if looks_like_ip(port_path) {
        let addr = if port_path.contains(':') {
            port_path.to_string()
        } else {
            format!("{port_path}:9100")
        };
        use std::net::TcpStream;
        use std::time::Duration;
        let mut stream = TcpStream::connect(&addr)
            .map_err(|e| format!("Cannot connect to {addr}: {e}"))?;
        stream.set_write_timeout(Some(Duration::from_secs(5)))
            .map_err(|e| format!("Timeout error: {e}"))?;
        stream.write_all(data).map_err(|e| format!("Network write error: {e}"))?;
        stream.flush().map_err(|e| format!("Network flush error: {e}"))?;
        return Ok(());
    }

    // macOS/Linux CUPS queue name → submit via lp -o raw
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    if !port_path.starts_with("/dev/") {
        use std::process::Command;
        let tmp = std::env::temp_dir().join("conveyoros_escpos.bin");
        std::fs::write(&tmp, data).map_err(|e| format!("Temp file error: {e}"))?;
        let out = Command::new("lp")
            .args(["-d", port_path, "-o", "raw", tmp.to_str().unwrap()])
            .output()
            .map_err(|e| format!("lp command failed: {e}"))?;
        if !out.status.success() {
            return Err(format!("lp error: {}", String::from_utf8_lossy(&out.stderr)));
        }
        return Ok(());
    }

    // Serial port or device node (/dev/cu.usb*, \\.\COM1, etc.) → write bytes directly
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .open(port_path)
        .map_err(|e| format!("Cannot open {port_path}: {e}"))?;
    file.write_all(data).map_err(|e| format!("Write error: {e}"))?;
    file.flush().map_err(|e| format!("Flush error: {e}"))?;
    Ok(())
}

// ── Legacy path ───────────────────────────────────────────────────────────────

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
