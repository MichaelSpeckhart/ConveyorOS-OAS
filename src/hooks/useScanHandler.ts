import { useEffect, useRef, useState } from "react";
import {
  clearConveyorTauri,
  completeTicketTauri,
  getCustomerFromTicket,
  getOccupiedSlotsTauri,
  getSlotManagerStatsTauri,
  getTicketFromGarment,
  handleScanTauri,
  isLastGarmentTauri,
  isTicketCompleteTauri,
  loadSensorHanger,
  removeGarmentFromSlotTauri,
  ticketExists,
  updateGarmentSlotTauri,
} from "../lib/slot_manager";
import { GarmentRow, listGarmentsForTicket, TicketRow } from "../lib/data";
import type { Slot, SlotManagerStats } from "../types/slotstats";
import type { customer } from "../types/customer";
import {
  getSessionByIdTauri,
  incrementSessionGarmentsTauri,
  incrementSessionTicketsTauri,
} from "../lib/session_manager";
import { slotRunRequest } from "../lib/opc";
import { LoadItem, UnloadItem } from "../lib/pos";

export type ScanState =
  | "waiting"
  | "success"
  | "error"
  | "oneitem"
  | "garmentonconveyor"
  | "ticketcomplete"
  | "removegarment";

export type TicketAckData = {
  ticketNum: string;
  customerName: string;
  garmentCount: number;
};

export function useScanHandler({ sessionId }: { sessionId?: number | null }) {
  const [state, setState] = useState<ScanState>("waiting");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [ticketsCompleted, setTicketsCompleted] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<customer | null>(null);
  const [ticketMeta, setTicketMeta] = useState<TicketRow | null>(null);
  const [garments, setGarments] = useState<GarmentRow[]>([]);
  const [slotStats, setSlotStats] = useState<SlotManagerStats | null>(null);
  const [clearingSlot, setClearingSlot] = useState<{ slotNumber: number; ticket: string } | null>(null);
  const [slotMapData, setSlotMapData] = useState<Slot[]>([]);
  const [ticketAckOpen, setTicketAckOpen] = useState(false);
  const [ticketAckData, setTicketAckData] = useState<TicketAckData | null>(null);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const nextResolveRef = useRef<(() => void) | null>(null);
  const ticketAckResolveRef = useRef<(() => void) | null>(null);

  const conveyorCapacity = slotStats ? Math.round(slotStats.capacity_percentage) : "—";

  const waitForNext = () =>
    new Promise<void>((resolve) => {
      nextResolveRef.current = resolve;
    });

  const waitForTicketAck = () =>
    new Promise<void>((resolve) => {
      ticketAckResolveRef.current = resolve;
    });

  const handleNextClear = () => {
    if (nextResolveRef.current) {
      nextResolveRef.current();
      nextResolveRef.current = null;
    }
  };

  const handleTicketAck = () => {
    setTicketAckOpen(false);
    if (ticketAckResolveRef.current) {
      ticketAckResolveRef.current();
      ticketAckResolveRef.current = null;
    }
  };

  const refreshSlotStats = async () => {
    try {
      const stats = await getSlotManagerStatsTauri();
      setSlotStats(stats);
    } catch {
      console.error("Failed to fetch slot manager stats");
    }
  };

  const refreshSlotMap = async () => {
    await refreshSlotStats();
    const occupied = await getOccupiedSlotsTauri();
    setSlotMapData(occupied);
  };

  const openSlotMap = async () => {
    const occupied = await getOccupiedSlotsTauri();
    setSlotMapData(occupied);
  };

  useEffect(() => {
    refreshSlotStats();
    if (sessionId) {
      getSessionByIdTauri(sessionId).then((session) => {
        if (session) {
          setScanCount(session.garments_scanned);
          setTicketsCompleted(session.tickets_completed);
        }
      });
    }
  }, [sessionId]);

  const handleClearConveyor = async () => {
    const slotsToClear = await getOccupiedSlotsTauri();
    if (slotsToClear.length === 0) return;

    for (const slot of slotsToClear) {
      try {
        if (slot.slot_number !== undefined) {
          setClearingSlot({ slotNumber: slot.slot_number, ticket: slot.assigned_ticket ?? "" });
          await slotRunRequest(slot.slot_number);
        }
        setState("removegarment");
        await waitForNext();
        await removeGarmentFromSlotTauri(slot.assigned_ticket ?? "", slot.slot_number);
        await refreshSlotStats();
      } catch (err) {
        console.error(`Failed to clear slot ${slot}:`, err);
      }
    }

    await clearConveyorTauri();
    setClearingSlot(null);
  };

  const handleClearAndReset = async () => {
    await handleClearConveyor();
    await refreshSlotStats();
    setCustomerInfo(null);
    setTicketMeta(null);
    setGarments([]);
    setState("waiting");
  };

  const handleScan = async (value: string) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const code = value.trim();

      if (!code || code.length < 4) {
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        setState("error");
        errorTimeoutRef.current = setTimeout(() => setState("waiting"), 1500);
        return;
      }

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }

      const exists = await ticketExists(code);
      if (!exists) {
        setState("error");
        setCustomerInfo(null);
        setTicketMeta(null);
        setGarments([]);
        return;
      }

      const ticketinfo = await getTicketFromGarment(code);

      // Check if garment is already on conveyor before isLast/isCompleted checks.
      let existingSlotNum: number | null = null;
      let preloadedGarments: GarmentRow[] = [];
      try {
        preloadedGarments = await listGarmentsForTicket(ticketinfo.full_invoice_number);
        const thisGarment = preloadedGarments.find((g) => g.item_id === code);
        if (thisGarment && thisGarment.slot_number !== -1) {
          existingSlotNum = thisGarment.slot_number;
        }
      } catch { /* ignore */ }

      if (existingSlotNum !== null) {
        const info = await getCustomerFromTicket(code);
        setCustomerInfo(info);
        setLastScan(code);
        setState("garmentonconveyor");
        setTicketMeta(ticketinfo);
        setGarments(preloadedGarments);
        try {
          await slotRunRequest(existingSlotNum);
        } catch (err) {
          console.error("Hardware operation failed:", err);
        }
        return;
      }

      const [info, isLast, isCompleted] = await Promise.all([
        getCustomerFromTicket(code),
        isLastGarmentTauri(code),
        isTicketCompleteTauri(ticketinfo.full_invoice_number),
      ]);

      if (isCompleted) {
        setState("ticketcomplete");
        let completedTicketNum: string | null = null;
        let garmentCount = 0;

        try {
          const ticket = await getTicketFromGarment(code);
          if (ticket) {
            completedTicketNum = ticket.full_invoice_number;
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            setGarments(rows);
            garmentCount = rows.length;
          } else {
            setTicketMeta(null);
            setGarments([]);
          }
        } catch {
          setTicketMeta(null);
          setGarments([]);
        }

        setTicketAckData({
          ticketNum: completedTicketNum ?? code,
          customerName: info ? `${info.first_name} ${info.last_name}` : "Unknown",
          garmentCount,
        });
        setTicketAckOpen(true);
        await waitForTicketAck();
        return;
      }

      setCustomerInfo(info);
      setLastScan(code);

      if (isLast) {
        const slotNum = await completeTicketTauri(code);
        setState("ticketcomplete");
        let completedTicketNum: string | null = null;
        let garmentCount = 0;

        try {
          const ticket = await getTicketFromGarment(code);
          if (ticket) {
            completedTicketNum = ticket.full_invoice_number;
            if (slotNum !== null) await updateGarmentSlotTauri(code, slotNum);
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            setGarments(rows);
            garmentCount = rows.length;
          } else {
            setTicketMeta(null);
            setGarments([]);
          }
        } catch {
          setTicketMeta(null);
          setGarments([]);
        }

        setTicketAckData({
          ticketNum: completedTicketNum ?? code,
          customerName: info ? `${info.first_name} ${info.last_name}` : "Unknown",
          garmentCount,
        });
        setTicketAckOpen(true);
        await waitForTicketAck();

        if (sessionId) {
          if (completedTicketNum) {
            const ticketSession = await incrementSessionTicketsTauri(sessionId);
            setTicketsCompleted(ticketSession.tickets_completed);
          }
          const garmentSession = await incrementSessionGarmentsTauri(sessionId);
          setScanCount(garmentSession.garments_scanned);
        } else {
          setScanCount((prev) => prev + 1);
          setTicketsCompleted((prev) => prev + 1);
        }

        try {
          if (slotNum !== null) await slotRunRequest(slotNum);
          await UnloadItem(code);
          if (slotNum !== null && completedTicketNum) {
            await removeGarmentFromSlotTauri(completedTicketNum, slotNum);
          }
        } catch (err) {
          console.error("Hardware operation failed:", err);
        }

        await refreshSlotStats();
        return;
      }

      let slotNum: number | null;
      try {
        slotNum = await handleScanTauri(code);
      } catch (err) {
        console.error("handleScanTauri failed:", err);
        setState("error");
        return;
      }

      if (slotNum !== null) {
        setState("success");

        if (sessionId) {
          const session = await incrementSessionGarmentsTauri(sessionId);
          setScanCount(session.garments_scanned);
        } else {
          setScanCount((prev) => prev + 1);
        }

        await refreshSlotStats();

        try {
          const ticket = await getTicketFromGarment(code);
          if (ticket) {
            try { await updateGarmentSlotTauri(code, slotNum); } catch (err) { console.error("updateGarmentSlotTauri failed:", err); }
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            setGarments(rows);
          } else {
            setTicketMeta(null);
            setGarments([]);
          }

          await slotRunRequest(slotNum);
          const sensorTriggered = await loadSensorHanger();
          if (sensorTriggered) setState("garmentonconveyor");

          await LoadItem(code);
        } catch (err) {
          console.error("Hardware operation failed:", err);
        }
      } else {
        setState("error");
      }
    } finally {
      isScanningRef.current = false;
    }
  };

  return {
    state,
    lastScan,
    scanCount,
    ticketsCompleted,
    customerInfo,
    ticketMeta,
    garments,
    slotStats,
    clearingSlot,
    slotMapData,
    conveyorCapacity,
    ticketAckOpen,
    ticketAckData,
    handleScan,
    handleClearAndReset,
    handleNextClear,
    handleTicketAck,
    refreshSlotStats,
    refreshSlotMap,
    openSlotMap,
  };
}
