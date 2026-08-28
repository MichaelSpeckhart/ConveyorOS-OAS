import { useEffect, useRef, useState } from "react";
import {
  addConveyorActivityTauri,
  addConveyorActivityUnloadTauri,
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

export type ScanAudioCueName =
  | "scan-success"
  | "scan-error"
  | "ticket-complete"
  | "garment-on-conveyor";

export type ScanAudioCue = {
  id: number;
  name: ScanAudioCueName;
};

export type TicketAckData = {
  ticketNum: string;
  customerName: string;
  garmentCount: number;
};

/** Operators scan ahead of the conveyor, so pending scans buffer here. */
const MAX_QUEUE = 8;
/** Barcode guns commonly double-fire; ignore a repeat of the same code inside this window. */
const DUPLICATE_WINDOW_MS = 2000;

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
  const [scanQueue, setScanQueue] = useState<string[]>([]);
  const [activeScan, setActiveScan] = useState<string | null>(null);
  const [queueRejected, setQueueRejected] = useState(false);
  const [scanAudioCue, setScanAudioCue] = useState<ScanAudioCue | null>(null);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextResolveRef = useRef<(() => void) | null>(null);
  const ticketAckResolveRef = useRef<(() => void) | null>(null);
  const scanAudioCueIdRef = useRef(0);

  // The queue is mirrored in a ref so enqueue/pump read the live value without
  // depending on a state flush, and in state so the UI can render it.
  const queueRef = useRef<string[]>([]);
  const pumpingRef = useRef(false);
  const lastEnqueuedRef = useRef<{ code: string; at: number } | null>(null);
  const rejectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conveyorCapacity = slotStats ? Math.round(slotStats.capacity_percentage) : "—";

  const emitScanAudioCue = (name: ScanAudioCueName) => {
    scanAudioCueIdRef.current += 1;
    setScanAudioCue({ id: scanAudioCueIdRef.current, name });
  };

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

  useEffect(() => () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current);
  }, []);

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
        if (slot.assigned_ticket != null && slot.item_id != null) {
          var customer = await getCustomerFromTicket(slot.assigned_ticket);

          if (customer != undefined)
            await addConveyorActivityUnloadTauri(slot.assigned_ticket, slot.item_id, slot.slot_number, customer?.customer_identifier);
        }
          
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
    // Pending scans refer to garments that are about to be taken off the
    // conveyor, so they must not survive the clear.
    queueRef.current = [];
    setScanQueue([]);
    lastEnqueuedRef.current = null;

    await handleClearConveyor();
    await refreshSlotStats();
    setCustomerInfo(null);
    setTicketMeta(null);
    setGarments([]);
    setState("waiting");
  };

  const flashError = () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setState("error");
    emitScanAudioCue("scan-error");
    errorTimeoutRef.current = setTimeout(() => setState("waiting"), 1500);
  };

  /**
   * Accepts a scan immediately and buffers it. Operators scan the next garment
   * while the conveyor is still travelling for the previous one, so this must
   * never block and never silently drop a code.
   */
  const enqueueScan = (value: string) => {
    const code = value.trim();
    if (!code) return;

    if (code.length < 4) {
      flashError();
      return;
    }

    const now = Date.now();
    const last = lastEnqueuedRef.current;
    if (last && last.code === code && now - last.at < DUPLICATE_WINDOW_MS) return;

    // Already waiting its turn — a second trigger of the same code is a misfire.
    if (queueRef.current.includes(code)) return;

    if (queueRef.current.length >= MAX_QUEUE) {
      if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current);
      setQueueRejected(true);
      emitScanAudioCue("scan-error");
      rejectTimeoutRef.current = setTimeout(() => setQueueRejected(false), 2500);
      return;
    }

    lastEnqueuedRef.current = { code, at: now };
    queueRef.current = [...queueRef.current, code];
    setScanQueue(queueRef.current);
    void pumpQueue();
  };

  /**
   * Drains the queue one garment at a time. Serial by design: the conveyor can
   * only travel to one slot at a time, and processScan already waits on the
   * hanger sensor, so the next garment never starts moving while the operator
   * still has hands on the current one.
   */
  const pumpQueue = async () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const [next, ...rest] = queueRef.current;
        queueRef.current = rest;
        setScanQueue(rest);
        setActiveScan(next);

        // processScan handles its own failures, so one bad code can't abort the drain.
        await processScan(next);
      }
    } finally {
      setActiveScan(null);
      pumpingRef.current = false;
    }
  };

  const processScan = async (value: string) => {
    try {
      const code = value.trim();

      if (!code || code.length < 4) {
        flashError();
        return;
      }

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }

      const exists = await ticketExists(code);
      if (!exists) {
        setState("error");
        emitScanAudioCue("scan-error");
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
        emitScanAudioCue("garment-on-conveyor");
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
        emitScanAudioCue("ticket-complete");
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
        emitScanAudioCue("ticket-complete");
        let completedTicketNum: string | null = null;
        let garmentCount = 0;

        try {
          const ticket = await getTicketFromGarment(code);
          if (ticket) {
            completedTicketNum = ticket.full_invoice_number;
            if (slotNum !== null) await updateGarmentSlotTauri(code, slotNum);
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            
            rows.forEach(async (garment) => {
              await addConveyorActivityUnloadTauri(ticket.full_invoice_number, garment.item_id, garment.slot_number, ticket.customer_identifier);
            });

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
        emitScanAudioCue("scan-error");
        return;
      }

      if (slotNum !== null) {
        setState("success");
        emitScanAudioCue("scan-success");

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
          if (sensorTriggered) {
            setState("garmentonconveyor");
            emitScanAudioCue("garment-on-conveyor");
          }

          try { await LoadItem(code); } catch (err) { console.error("LoadItem failed:", err); }

          await addConveyorActivityTauri(ticket.full_invoice_number, code, slotNum, ticket.customer_identifier);

        } catch (err) {
          console.error("Hardware operation failed:", err);
        }
      } else {
        setState("error");
        emitScanAudioCue("scan-error");
      }
    } catch (err) {
      // Never let one bad garment stall the queue behind it.
      console.error("Scan processing failed:", err);
      flashError();
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
    scanQueue,
    activeScan,
    queueRejected,
    scanAudioCue,
    handleScan: enqueueScan,
    handleClearAndReset,
    handleNextClear,
    handleTicketAck,
    refreshSlotStats,
    refreshSlotMap,
    openSlotMap,
  };
}
