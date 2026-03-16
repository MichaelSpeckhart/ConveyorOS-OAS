import { useEffect, useRef, useState } from "react";
import GarmentKeyboard from "../../components/GarmentKeyboard";
import { completeTicketTauri, getCustomerFromTicket, getOccupiedSlotsTauri, getSlotManagerStatsTauri, getTicketFromGarment, handleScanTauri, isLastGarmentTauri, loadSensorHanger, removeGarmentFromSlotTauri, ticketExists, updateGarmentSlotTauri } from "../../lib/slot_manager";
import { GarmentRow, listGarmentsForTicket, TicketRow } from "../../lib/data";
import type { Slot, SlotManagerStats } from "../../types/slotstats";
import { getSessionByIdTauri, incrementSessionGarmentsTauri, incrementSessionTicketsTauri } from "../../lib/session_manager";
import { slotRunRequest } from "../../lib/opc";
import { LoadItem, UnloadItem } from "../../lib/pos";


type ScanState = "waiting" | "success" | "error" | "oneitem" | "garmentonconveyor" | "ticketcomplete" | "removegarment";

const STATE_STYLE = {
  waiting: { bg: "bg-yellow-400", text: "text-yellow-950", title: "WAITING FOR SCAN", subtitle: "Position barcode under scanner" },
  success: { bg: "bg-green-600", text: "text-white", title: "SCAN SUCCESS", subtitle: "Garment accepted and logged" },
  error: { bg: "bg-red-600", text: "text-white", title: "SCAN ERROR", subtitle: "Invalid barcode - please try again" },
  oneitem: { bg: "bg-green-600", text: "text-white", title: "SINGLE ITEM TICKET", subtitle: "DO NOT RACK ITEM" },
  garmentonconveyor: { bg: "bg-blue-600", text: "text-white", title: "GARMENT ON CONVEYOR", subtitle: "" },
  ticketcomplete: { bg: "bg-green-600", text: "text-white", title: "TICKET COMPLETE", subtitle: "REMOVE GARMENTS AND PROCEED" },
  removegarment: { bg: "bg-red-600", text: "text-white", title: "REMOVE GARMENT", subtitle: "Please remove garments from conveyor" },
};


export default function GarmentScanner({ onOpenRecall, sessionId }: { onOpenRecall?: () => void; sessionId?: number | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [barcode, setBarcode] = useState("");
  const [state, setState] = useState<ScanState>("waiting");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<null | any>(null);
  const [ticketMeta, setTicketMeta] = useState<null | TicketRow>(null);
  const [garments, setGarments] = useState<GarmentRow[]>([]);
  const [slotStats, setSlotStats] = useState<SlotManagerStats | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [clearSequence, setClearSequence] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [clearingSlot, setClearingSlot] = useState<{ slotNumber: number; ticket: string } | null>(null);
  const [slotMapOpen, setSlotMapOpen] = useState(false);
  const [slotMapData, setSlotMapData] = useState<Slot[]>([]);
  const nextResolveRef = useRef<(() => void) | null>(null);

  const waitForNext = () => new Promise<void>((resolve) => { nextResolveRef.current = resolve; });

  const handleNextClear = () => {
    if (nextResolveRef.current) {
      nextResolveRef.current();
      nextResolveRef.current = null;
    }
  };
  const [ticketsCompleted, setTicketsCompleted] = useState(0);
  const conveyorCapacity = slotStats ? Math.round(slotStats.capacity_percentage) : "—";

  const refreshSlotStats = async () => {
    try {
      const stats = await getSlotManagerStatsTauri();
      setSlotStats(stats);
    } catch {
      // keep previous stats on error
      console.error("Failed to fetch slot manager stats");
    }
  };

  const openKeypad = () => { setManualCode(""); setKeypadOpen(true); };
  const closeKeypad = () => { setKeypadOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const openClear = () => { setClearSequence(""); setClearOpen(true); };
  const closeClear = () => { setClearOpen(false); setClearingSlot(null); setTimeout(() => inputRef.current?.focus(), 0); };
  const openSlotMap = async () => {
    const occupied = await getOccupiedSlotsTauri();
    setSlotMapData(occupied);
    setSlotMapOpen(true);
  };
  const closeSlotMap = () => { setSlotMapOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };

  const submitManual = async () => {
    await handleScan(manualCode);
    closeKeypad();
  };

  const pressClearKey = async (k: string) => {
    const next = (clearSequence + k).slice(-3);
    setClearSequence(next);
    if (next === "123") {
      closeClear();
      await handleClearConveyor();
      await refreshSlotStats();
      
      setCustomerInfo(null);
      setTicketMeta(null);
      setGarments([]);
      setState("waiting");
    }
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

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener("click", focusInput);
    return () => window.removeEventListener("click", focusInput);
  }, []);

  const handleClearConveyor = async () => {

    // await clearConveyorTauri();

    const slotsToClear = await getOccupiedSlotsTauri();

    console.log("Slots to clear:", slotsToClear);

    if (slotsToClear.length === 0) {
      return;
    }

    for (const slot of slotsToClear) {

      try {

        if (slot.slot_number !== undefined){

          setClearingSlot({ slotNumber: slot.slot_number, ticket: slot.assigned_ticket ?? "" });
          await slotRunRequest(slot.slot_number);
        }

        setState("removegarment");


        await waitForNext();

        // Update Database
        await removeGarmentFromSlotTauri(slot.assigned_ticket ?? "", slot.slot_number);

        await refreshSlotStats();

      } catch (err) {
        console.error(`Failed to clear slot ${slot}:`, err);
      }
    }

    setClearingSlot(null);
  }

  
  const handleScan = async (value: string) => {
  
    const code = value.trim();
  
    if (!code || code.length < 4) {
  
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  
      setState("error");
  
      errorTimeoutRef.current = setTimeout(() => setState("waiting"), 1500);
  
      return;
  
    }


  
    if (keypadOpen) closeKeypad();
  
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


  
    // Fetch customer info and last-garment flag concurrently
  
    const [info, isLast] = await Promise.all([
  
      getCustomerFromTicket(code),
  
      isLastGarmentTauri(code),
  
    ]);
  
    setCustomerInfo(info);


    // Load ticket + garment list for both branches
    

    setLastScan(code);

    
    if (isLast) {
    
      const slotNum = await completeTicketTauri(code);
    
      setState("ticketcomplete");

      let completedTicketNum: string | null = null;

      if (sessionId) {

        try {

          const ticket = await getTicketFromGarment(code);

          if (ticket) {
          
            completedTicketNum = ticket.full_invoice_number;
          
            if (slotNum !== null) updateGarmentSlotTauri(code, slotNum);
          
            setTicketMeta(ticket);
          
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
          
            setGarments(rows);

            if (ticket.ticket_status !== "completed") {
              const ticketSession = await incrementSessionTicketsTauri(sessionId);
              setTicketsCompleted(ticketSession.tickets_completed);
            }

            const garmentSession = await incrementSessionGarmentsTauri(sessionId);
            setScanCount(garmentSession.garments_scanned);

            
          
          } else {
          
            setTicketMeta(null);
          
            setGarments([]);
          
          }
        
        } catch {

          setTicketMeta(null);

          setGarments([]);

        }

        

        

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
    
      console.log("handleScanTauri result:", slotNum);
    
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
    
    } catch {
    
      setTicketMeta(null);
    
      setGarments([]);
    
    }
    
    const [, sensorTriggered] = await Promise.all([
    
          slotRunRequest(slotNum),
    
          loadSensorHanger(),
    
        ]);
    
        if (sensorTriggered) setState("garmentonconveyor");
    
        await LoadItem(code);
    
      } catch (err) {
    
        console.error("Hardware operation failed:", err);
    
      }
    
    } else {
    
      setState("error");
    
    }

  };

  return (
    <div className="flex-1 bg-slate-50 grid grid-rows-[32vh,1fr,104px] p-5 gap-5 overflow-hidden h-full min-h-0">

      {/* 1. TOP SECTION: Status Hero */}
      <div className={`relative flex flex-col items-center justify-center rounded-3xl shadow-xl transition-all duration-300 ${STATE_STYLE[state].bg} ${STATE_STYLE[state].text}`}>

        {/* Options Dropdown - Anchored top-right of hero */}
        <div className="absolute top-5 right-5">
          <button
            onClick={() => setOptionsOpen((o) => !o)}
            className="bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 font-bold flex items-center gap-2 border border-black/5 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            Options
          </button>
          {optionsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOptionsOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden min-w-[200px]">
                <button
                  onClick={() => { setOptionsOpen(false); onOpenRecall ? onOpenRecall() : console.log("Open Recall - Not Implemented"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 font-bold text-sm text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Recall
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={() => { setOptionsOpen(false); openSlotMap(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 font-bold text-sm text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  Slot Map
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={() => { setOptionsOpen(false); openClear(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 font-bold text-sm text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>
                  Clear Conveyor
                </button>
              </div>
            </>
          )}
        </div>

        <h1 className="text-8xl font-black mb-3 tracking-tight uppercase">{STATE_STYLE[state].title}</h1>
        <p className="text-2xl font-black opacity-80">{STATE_STYLE[state].subtitle}</p>
        {state === "removegarment" && clearingSlot && (
          <div className="mt-4 flex items-center gap-6">
            <div className="bg-black/20 rounded-2xl px-6 py-3 text-center">
              <div className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">Slot</div>
              <div className="text-5xl font-black">{clearingSlot.slotNumber}</div>
            </div>
            {clearingSlot.ticket && (
              <div className="bg-black/20 rounded-2xl px-6 py-3 text-center">
                <div className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">Ticket</div>
                <div className="text-3xl font-black">{clearingSlot.ticket}</div>
              </div>
            )}
            <button
              onClick={handleNextClear}
              className="bg-white text-red-600 hover:bg-red-50 font-black text-xl px-8 py-4 rounded-2xl shadow-lg border-2 border-white/60 active:scale-95 transition-all"
            >
              NEXT →
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { handleScan(barcode); setBarcode(""); } }}
          className="absolute opacity-0 pointer-events-none"
          autoFocus
        />
      </div>

      {/* 2. MIDDLE SECTION: Customer Info (left) + Current Garment (right) */}
      <div className="grid grid-cols-[1fr_320px] gap-5 min-h-0">
        {/* Left: Customer + Garment List */}
        <div className="min-h-0 flex flex-col">
          {customerInfo ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4 h-full min-h-0 overflow-hidden">
              {/* Customer header */}
              <div className="flex items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-0.5">Customer</p>
                  <h2 className="text-3xl font-black text-slate-900 leading-none">
                    {customerInfo.first_name} {customerInfo.last_name}
                  </h2>
                </div>
                {ticketMeta && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-0.5">Pickup</p>
                    <div className="text-lg font-black text-slate-700">{fmtDate(ticketMeta.invoice_pickup_date)}</div>
                  </div>
                )}
              </div>

              {/* Garment list */}
              <div className="flex-1 min-h-0 overflow-auto divide-y divide-slate-100">
                {garments.length === 0 ? (
                  <div className="py-4 text-slate-400 text-sm text-center">No garments on this ticket.</div>
                ) : (
                  garments.map((g) => (
                    <div key={g.id} className={`py-2.5 flex items-center justify-between gap-3 ${g.item_id === lastScan ? "bg-green-50 -mx-1 px-1 rounded-lg" : ""}`}>
                      <div className="font-semibold text-slate-800 text-sm">{g.item_description}</div>
                      <div className={`px-3 py-1 rounded-lg text-sm font-black shrink-0 ${g.slot_number === -1 ? "bg-slate-100 text-slate-400" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
                        {g.slot_number === -1 ? "—" : `Slot ${g.slot_number}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl h-full flex items-center justify-center">
              <span className="text-4xl text-slate-300 font-black uppercase tracking-tighter">Ready for next garment</span>
            </div>
          )}
        </div>

        {/* Right: Current Garment Slot */}
        {(() => {
          const currentGarment = garments.find((g) => g.item_id === lastScan);
          return currentGarment ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3 h-full min-h-0">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Current Garment</p>
              <h2 className="text-xl font-black text-slate-900 leading-snug break-words">{currentGarment.item_description}</h2>
              <div className="mt-auto rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-green-600 font-bold mb-2">Place in Slot</div>
                <div className="text-7xl font-black text-green-700">
                  {currentGarment.slot_number === -1 ? "—" : currentGarment.slot_number}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl h-full flex items-center justify-center">
              <span className="text-slate-300 font-black uppercase tracking-tighter text-center px-4">No Garment</span>
            </div>
          );
        })()}
      </div>

      {/* 3. BOTTOM SECTION: Stats + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-3 h-full min-h-0">
        <div className="grid grid-cols-3 gap-3 h-full">
          <StatBox label="Tickets Completed" value={ticketsCompleted} color="text-green-600" border="border-b-[6px] border-green-500" />
          <StatBox label="Garments Scanned" value={scanCount} color="text-blue-600" border="border-b-[6px] border-blue-500" />
          <StatBox label="Conveyor Capacity" value={conveyorCapacity} color="text-slate-900" suffix="%" />
        </div>

        <button
          onClick={openKeypad}
          className="flex flex-col items-center justify-center gap-1 bg-slate-900 hover:bg-slate-700 text-white rounded-xl transition-all active:scale-95 shadow-sm border border-slate-200 h-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h.01M12 7h.01M17 7h.01M7 12h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01" />
          </svg>
          <span className="font-black uppercase tracking-tighter text-sm">Manual Entry</span>
        </button>
      </div>

      {keypadOpen && (
        <GarmentKeyboard
          value={manualCode}
          onChange={setManualCode}
          onSubmit={submitManual}
          onClose={closeKeypad}
        />
      )}

      {slotMapOpen && slotStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onMouseDown={(e) => e.target === e.currentTarget && closeSlotMap()}>
          <div className="w-full max-w-3xl max-h-[85vh] rounded-[2.5rem] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Slot Map</h3>
                <p className="text-sm text-slate-400 font-semibold mt-0.5">
                  {slotMapData.length} of {slotStats.total_slots} slots occupied &mdash; {Math.round(slotStats.capacity_percentage)}% full
                </p>
              </div>
              <button onClick={closeSlotMap} className="text-slate-400 hover:text-red-500 text-2xl font-bold leading-none">✕</button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 px-8 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" /> Empty
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <div className="w-4 h-4 rounded bg-blue-500" /> Occupied
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
                {Array.from({ length: slotStats.total_slots }, (_, i) => {
                  const slotNum = i + 1;
                  const occupied = slotMapData.find((s) => s.slot_number === slotNum);
                  return (
                    <div
                      key={slotNum}
                      title={occupied ? `Ticket: ${occupied.assigned_ticket ?? "—"}` : "Empty"}
                      className={`relative flex flex-col items-center justify-center rounded-xl aspect-square text-center transition-all select-none
                        ${occupied
                          ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                    >
                      <span className="text-lg font-black leading-none">{slotNum}</span>
                      {occupied && (
                        <span className="text-[9px] font-bold opacity-80 mt-0.5 px-1 leading-tight truncate w-full text-center">
                          {occupied.assigned_ticket ?? ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer refresh */}
            <div className="flex justify-end px-8 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={async () => { await refreshSlotStats(); const occupied = await getOccupiedSlotsTauri(); setSlotMapData(occupied); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {clearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onMouseDown={(e) => e.target === e.currentTarget && closeClear()}>
          <div className="w-full max-w-sm rounded-[2.5rem] bg-white shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">CLEAR CONVEYOR</h3>
              <button onClick={closeClear} className="text-slate-400 hover:text-red-500 text-2xl">✕</button>
            </div>
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
              <span className="text-3xl font-mono font-bold tracking-widest text-red-600">{clearSequence.padEnd(3, "•")}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["1","2","3"].map((k) => (
                <button
                  key={k}
                  onClick={() => pressClearKey(k)}
                  className="h-16 rounded-2xl text-2xl font-black transition-all active:scale-90 bg-slate-800 text-white hover:bg-black"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Press 1 → 2 → 3 to confirm clearing all conveyor slots.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, border = "", suffix = "" }: any) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col justify-center items-center ${border}`}>
      <span className="text-slate-900 text-base font-black uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-5xl font-black tracking-tighter ${color}`}>{value}{suffix}</span>
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

