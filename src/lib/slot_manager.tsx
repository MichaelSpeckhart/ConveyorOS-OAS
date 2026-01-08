import { invoke } from "@tauri-apps/api/core";
import { customer } from "../types/customer";


export async function ticketExists(ticket: string): Promise<boolean> {
    return invoke<boolean>("ticket_exists_tauri", { ticket });
}


export async function getCustomerFromTicket(ticket: string): Promise<customer | null> {
    console.log("Invoking get_customer_from_ticket_tauri with ticket:", ticket);
    return invoke<customer | null>("get_customer_from_ticket_tauri", { ticket });
}

export async function getNumItemsOnTicket(ticket: string): Promise<number> {
    
    return invoke<number>("get_num_items_on_ticket", { ticket });
}

export async function handleScanTauri(scan_code: string): Promise<number | null> {
  return invoke<number | null>("handle_scan_tauri", { scanCode: scan_code });
}

export async function loadSensorHanger() : Promise<boolean> {
    console.log("Invoking load_sensor_hanger_tauri");
    return invoke<boolean>("wait_for_hanger_sensor");
}

export async function isLastGarmentTauri(ticket: string): Promise<boolean> {
    return invoke<boolean>("is_last_garment", { ticket });
}

export async function getSlotNumberFromBarcodeTauri(ticket: string): Promise<number | null> {
    return invoke<number | null>("get_slot_number_from_barcode_tauri", { ticket });
}

export async function garmentTicketOnConveyorTauri(ticket: string): Promise<number | string> {
    return invoke<number | string>("garment_ticket_on_conveyor_tauri", { ticket });
}

import { listen } from "@tauri-apps/api/event";

listen<boolean>("hanger-sensor", (e) => {
  console.log("Sensor changed:", e.payload);
});

