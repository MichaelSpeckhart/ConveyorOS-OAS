import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScanHandler } from "../src/hooks/useScanHandler";
import { invokeMock, mockTauriCommands } from "./utils/tauri";

describe("scan queue after ticket completion", () => {
  it.each([
    { alreadyCompleted: false, printError: null },
    { alreadyCompleted: false, printError: "Printer unavailable" },
    { alreadyCompleted: true, printError: null },
  ])("preserves queued garments and waits for the next confirmation (%j)", async ({ alreadyCompleted, printError }) => {
    mockTauriCommands({
      get_slot_manager_stats: {
        total_slots: 10,
        occupied_slots: 1,
        occupancy_percentage: 10,
        active_slot_numbers: [1],
      },
      ticket_exists_tauri: true,
      get_ticket_from_garment: (args: { barcode: string }) => ({
        full_invoice_number: args.barcode === "COMPLETE" ? "INV-COMPLETE" : "INV-OTHER",
        customer_identifier: "CUST-1",
      }),
      get_customer_from_ticket_tauri: { first_name: "Jane", last_name: "Customer" },
      data_list_garments_for_ticket: [],
      is_last_garment: (args: { ticket: string }) => args.ticket === "COMPLETE",
      is_ticket_complete_tauri: (args: { ticket: string }) =>
        alreadyCompleted && args.ticket === "INV-COMPLETE",
      complete_ticket_tauri: { slot_number: 1, print_error: printError },
      handle_scan_tauri: 2,
      update_garment_slot_tauri: undefined,
      slot_run_request_tauri: undefined,
      wait_for_hanger_sensor: true,
      load_item_tauri: undefined,
      add_conveyor_activity_load_tauri: undefined,
    });

    const { result } = renderHook(() => useScanHandler({}));

    act(() => {
      result.current.handleScan("FIRST");
      result.current.handleScan("COMPLETE");
      result.current.handleScan("NEXT-1");
      result.current.handleScan("NEXT-2");
    });

    await waitFor(() => expect(result.current.nextGarmentPrompt).toBe("COMPLETE"));
    expect(result.current.scanQueue).toEqual(["COMPLETE", "NEXT-1", "NEXT-2"]);
    act(() => result.current.handleNextGarment());

    await waitFor(() => expect(result.current.ticketAckOpen).toBe(true));
    expect(result.current.scanQueue).toEqual(["NEXT-1", "NEXT-2"]);
    expect(result.current.ticketAckData?.ticketNum).toBe("INV-COMPLETE");
    expect(result.current.ticketAckData?.printError).toBe(alreadyCompleted ? null : printError);
    expect(invokeMock).not.toHaveBeenCalledWith("ticket_exists_tauri", { ticket: "NEXT-1" });

    act(() => result.current.handleTicketAck());

    await waitFor(() => expect(result.current.nextGarmentPrompt).toBe("NEXT-1"));
    expect(result.current.ticketAckOpen).toBe(false);
    expect(result.current.scanQueue).toEqual(["NEXT-1", "NEXT-2"]);
    expect(invokeMock).not.toHaveBeenCalledWith("ticket_exists_tauri", { ticket: "NEXT-1" });

    act(() => result.current.handleNextGarment());
    await waitFor(() => expect(result.current.nextGarmentPrompt).toBe("NEXT-2"));
    expect(result.current.lastScan).toBe("NEXT-1");
    expect(result.current.scanQueue).toEqual(["NEXT-2"]);

    act(() => result.current.handleNextGarment());
    await waitFor(() => expect(result.current.activeScan).toBeNull());
    expect(result.current.lastScan).toBe("NEXT-2");
    expect(result.current.scanQueue).toEqual([]);
    expect(result.current.scanCount).toBe(alreadyCompleted ? 3 : 4);
    expect(result.current.ticketsCompleted).toBe(alreadyCompleted ? 0 : 1);
  });
});
