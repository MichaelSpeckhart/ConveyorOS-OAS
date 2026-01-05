import { invoke } from "@tauri-apps/api/core";

export type CustomerRow = {
  id: number;
  customer_identifier: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at: string;
};

export type TicketRow = {
  id: number;
  full_invoice_number: string;
  display_invoice_number: string;
  number_of_items: number;
  customer_identifier: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone_number: string;
  invoice_dropoff_date: string;
  invoice_pickup_date: string;
  created_at: string;
  garments_processed: number;
};

export type GarmentRow = {
  id: number;
  full_invoice_number: string;
  display_invoice_number: string;
  item_id: string;
  item_description: string;
  invoice_dropoff_date: string;
  invoice_pickup_date: string;
  invoice_comments: string;
  slot_number: number;
};

export async function listCustomers(query?: string): Promise<CustomerRow[]> {
  return invoke<CustomerRow[]>("data_list_customers", { query: query ?? null });
}

export async function listTicketsForCustomer(customer_identifier: string): Promise<TicketRow[]> {
  return invoke<TicketRow[]>("data_list_tickets_for_customer", { customerIdentifier: customer_identifier });
}

export async function listGarmentsForTicket(full_invoice_number: string): Promise<GarmentRow[]> {
  return invoke<GarmentRow[]>("data_list_garments_for_ticket", { fullInvoiceNumber: full_invoice_number });
}
