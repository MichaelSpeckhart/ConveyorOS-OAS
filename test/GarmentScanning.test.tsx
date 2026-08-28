import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GarmentScanner from "../src/pages/scan/GarmentScanning";
import { invokeMock, mockTauriCommands } from "./utils/tauri";

const hookMocks = vi.hoisted(() => ({
  handleScan: vi.fn(),
  handleClearAndReset: vi.fn(),
  handleNextClear: vi.fn(),
  handleTicketAck: vi.fn(),
  refreshSlotMap: vi.fn(async () => undefined),
  openSlotMap: vi.fn(async () => undefined),
}));

vi.mock("../src/hooks/useScanHandler", () => ({
  useScanHandler: () => ({
    state: "waiting",
    lastScan: null,
    scanCount: 0,
    ticketsCompleted: 0,
    customerInfo: null,
    ticketMeta: null,
    garments: [],
    slotStats: { total_slots: 10, slots_used: 0, capacity_percentage: 0 },
    clearingSlot: null,
    slotMapData: [],
    conveyorCapacity: 0,
    ticketAckOpen: false,
    ticketAckData: null,
    scanQueue: [],
    queueRejected: false,
    scanAudioCue: null,
    handleScan: hookMocks.handleScan,
    handleClearAndReset: hookMocks.handleClearAndReset,
    handleNextClear: hookMocks.handleNextClear,
    handleTicketAck: hookMocks.handleTicketAck,
    refreshSlotMap: hookMocks.refreshSlotMap,
    openSlotMap: hookMocks.openSlotMap,
  }),
}));

const customer = {
  id: 1,
  customer_identifier: "CUST-1",
  first_name: "Jane",
  last_name: "Customer",
  phone_number: "555-0100",
  created_at: "2026-08-25T12:00:00Z",
};

const ticket = {
  id: 10,
  full_invoice_number: "INV-100",
  display_invoice_number: "100",
  number_of_items: 1,
  customer_identifier: "CUST-1",
  customer_first_name: "Jane",
  customer_last_name: "Customer",
  customer_phone_number: "555-0100",
  invoice_dropoff_date: "2026-08-24T12:00:00Z",
  invoice_pickup_date: "2026-08-26T12:00:00Z",
  created_at: "2026-08-25T12:00:00Z",
  garments_processed: 0,
  ticket_status: "Processing",
};

describe("GarmentScanner recall handoff", () => {
  beforeEach(() => {
    hookMocks.handleScan.mockClear();
    mockTauriCommands({
      ticket_exists_tauri: true,
      get_customer_from_ticket_tauri: customer,
      get_ticket_from_garment: ticket,
      data_list_garments_for_ticket: [],
    });
  });

  it("disables the conveyor scanner input while recall owns scanner input", async () => {
    const user = userEvent.setup();
    render(<GarmentScanner sessionId={null} username="operator" />);

    const mainScannerInput = document.querySelector("input") as HTMLInputElement;
    fireEvent.change(mainScannerInput, { target: { value: "CONVEYOR-123" } });
    fireEvent.keyDown(mainScannerInput, { key: "Enter", code: "Enter" });
    expect(hookMocks.handleScan).toHaveBeenCalledWith("CONVEYOR-123");

    hookMocks.handleScan.mockClear();
    await user.click(screen.getByRole("button", { name: /recall/i }));

    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    expect(inputs[0]).toBeDisabled();
    expect(inputs[1]).not.toBeDisabled();

    fireEvent.change(inputs[1], { target: { value: "RECALL-123" } });
    fireEvent.keyDown(inputs[1], { key: "Enter", code: "Enter" });

    expect(await screen.findByText("Jane Customer")).toBeInTheDocument();
    expect(hookMocks.handleScan).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("ticket_exists_tauri", { ticket: "RECALL-123" });
    });
  });
});
