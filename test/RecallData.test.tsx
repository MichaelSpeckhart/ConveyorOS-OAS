import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecallData from "../src/pages/scan/RecallData";
import { invokeMock, mockTauriCommands } from "./utils/tauri";

const customer = {
  id: 1,
  customer_identifier: "CUST-1",
  first_name: "Jane",
  last_name: "Customer",
  phone_number: "555-0100",
  created_at: "2026-08-25T12:00:00Z",
  email: "jane@example.com",
};

const ticket = {
  id: 10,
  full_invoice_number: "INV-100",
  display_invoice_number: "100",
  number_of_items: 2,
  customer_identifier: "CUST-1",
  customer_first_name: "Jane",
  customer_last_name: "Customer",
  customer_phone_number: "555-0100",
  invoice_dropoff_date: "2026-08-24T12:00:00Z",
  invoice_pickup_date: "2026-08-26T12:00:00Z",
  created_at: "2026-08-25T12:00:00Z",
  garments_processed: 1,
  ticket_status: "Processing",
};

const garments = [
  {
    id: 100,
    full_invoice_number: "INV-100",
    display_invoice_number: "100",
    item_id: "GARMENT-123",
    item_description: "Blue Shirt",
    invoice_dropoff_date: "2026-08-24T12:00:00Z",
    invoice_pickup_date: "2026-08-26T12:00:00Z",
    invoice_comments: "",
    slot_number: 7,
    garment_state: "Processing",
  },
];

describe("RecallData", () => {
  beforeEach(() => {
    mockTauriCommands({
      ticket_exists_tauri: true,
      get_customer_from_ticket_tauri: customer,
      get_ticket_from_garment: ticket,
      data_list_garments_for_ticket: garments,
    });
  });

  it("recalls garment data from scanner-style input", async () => {
    render(<RecallData open onClose={vi.fn()} />);

    const scannerInput = document.querySelector("input");
    expect(scannerInput).toBeInTheDocument();

    fireEvent.change(scannerInput!, { target: { value: "GARMENT-123" } });
    fireEvent.keyDown(scannerInput!, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("Jane Customer")).toBeInTheDocument();
    expect(screen.getByText("Blue Shirt")).toBeInTheDocument();
    expect(screen.getByText("Slot 7")).toBeInTheDocument();

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("ticket_exists_tauri", { ticket: "GARMENT-123" });
      expect(invokeMock).toHaveBeenCalledWith("get_customer_from_ticket_tauri", { ticket: "GARMENT-123" });
      expect(invokeMock).toHaveBeenCalledWith("get_ticket_from_garment", { barcode: "GARMENT-123" });
      expect(invokeMock).toHaveBeenCalledWith("data_list_garments_for_ticket", { fullInvoiceNumber: "INV-100" });
    });
  });

  it("uses a touch-friendly close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<RecallData open onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: /close recall popup/i });
    expect(closeButton).toHaveClass("h-14", "w-14");

    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
