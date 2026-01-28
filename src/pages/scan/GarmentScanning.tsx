import { useEffect, useRef, useState } from "react";
import { clearConveyorTauri, getCustomerFromTicket, getNumItemsOnTicket, getSlotNumberFromBarcodeTauri, getSlotManagerStatsTauri, getTicketFromGarment, handleScanTauri, isLastGarmentTauri, loadSensorHanger, ticketExists } from "../../lib/slot_manager";
import { slotRunRequest, opcConnected } from "../../lib/opc";
import { GarmentRow, listGarmentsForTicket, TicketRow } from "../../lib/data";
import type { SlotManagerStats } from "../../types/slotstats";

type ScanState = "waiting" | "success" | "error" | "oneitem" | "garmentonconveyor" | "ticketcomplete" | "conveyordisconnected";

const STATE_STYLE = {
  waiting: { bg: "bg-yellow-400", text: "text-yellow-950", title: "WAITING FOR SCAN", subtitle: "Position barcode under scanner" },
  success: { bg: "bg-green-600", text: "text-white", title: "SCAN SUCCESS", subtitle: "Garment accepted and logged" },
  error: { bg: "bg-red-600", text: "text-white", title: "SCAN ERROR", subtitle: "Invalid barcode - please try again" },
  oneitem: { bg: "bg-green-600", text: "text-white", title: "SINGLE ITEM TICKET", subtitle: "DO NOT RACK ITEM" },
  garmentonconveyor: { bg: "bg-blue-600", text: "text-white", title: "GARMENT ON CONVEYOR", subtitle: "" },
  ticketcomplete: { bg: "bg-green-600", text: "text-white", title: "TICKET COMPLETE", subtitle: "REMOVE GARMENTS AND PROCEED" },
  conveyordisconnected: { bg: "bg-red-600", text: "text-white", title: "CONVEYOR DISCONNECTED", subtitle: "CHECK OPC CONNECTION" },
};

export default function GarmentScanner({ onOpenRecall }: { onOpenRecall?: () => void }) {
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
  const [isConveyorConnected, setIsConveyorConnected] = useState(true);
  const [nextSlot, setNextSlot] = useState<number | null>(null);
  const ticketsCompleted = slotStats?.slots_used ?? "—";
  const conveyorCapacity = slotStats ? Math.round(slotStats.capacity_percentage) : "—";

  const refreshSlotStats = async () => {
    try {
      const stats = await getSlotManagerStatsTauri();
      setSlotStats(stats);
    } catch {
      // keep previous stats on error
    }
  };

  const openKeypad = () => { setManualCode(""); setKeypadOpen(true); };
  const closeKeypad = () => { setKeypadOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const openClear = () => { setClearSequence(""); setClearOpen(true); };
  const closeClear = () => { setClearOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };

  const pressKey = (k: string) => {
    if (k === "⌫") return setManualCode((s) => s.slice(0, -1));
    if (k === "CLR") return setManualCode("");
    setManualCode((s) => s + k);
  };

  const submitManual = async () => {
    await handleScan(manualCode);
    closeKeypad();
  };

  const pressClearKey = async (k: string) => {
    const next = (clearSequence + k).slice(-3);
    setClearSequence(next);
    if (next === "123") {
      await clearConveyorTauri();
      await refreshSlotStats();
      closeClear();
      setCustomerInfo(null);
      setTicketMeta(null);
      setGarments([]);
      setState("waiting");
    }
  };

  // useEffect(() => {
  //   let interval = setInterval(async () => {
  //     const connected = await opcConnected();
  //     setIsConveyorConnected(connected);
  //     if (!connected) setState("conveyordisconnected");
  //   }, 3000);
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener("click", focusInput);
    return () => window.removeEventListener("click", focusInput);
  }, []);

  const handleScan = async (value: string) => {
    const code = value.trim();
    if (!code || code.length < 4) {
      setState("error");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setState("waiting"), 1500);
      return;
    }
    //if (!isConveyorConnected) { setState("waiting"); return; }
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

    let isLast = await isLastGarmentTauri(code);
    if (isLast) {
      setState("ticketcomplete");
      let slotNum = await getSlotNumberFromBarcodeTauri(code);  
      setNextSlot(slotNum);
      console.log("Last garment scanned for ticket:", code, "Slot Number:", slotNum); 
      const info = await getCustomerFromTicket(code);
      setCustomerInfo(info);
      await slotRunRequest(slotNum!);
      await refreshSlotStats();
      return;
    }

    const info = await getCustomerFromTicket(code);
    setCustomerInfo(info);
    try {
      const ticket = await getTicketFromGarment(code);
      if (ticket) {
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
    let slot_num = await handleScanTauri(code);
    setState("success");
    setLastScan(code);
    setScanCount((prev) => prev + 1);
    setNextSlot(slot_num);
    await slotRunRequest(slot_num!);
    await refreshSlotStats();

    if (await loadSensorHanger()) setState("garmentonconveyor"); 
    return;
  };

  return (
    <div className="flex-1 bg-slate-100 grid grid-rows-[32vh,1fr,104px] p-5 gap-5 overflow-hidden h-full min-h-0">
      
      {/* 1. TOP SECTION: Status Hero */}
      <div className={`relative flex flex-col items-center justify-center rounded-3xl shadow-xl transition-all duration-300 ${STATE_STYLE[state].bg} ${STATE_STYLE[state].text}`}>
        
        {/* More Options Button - Anchored top-right of hero
            Need to display recall screen
        */}
        <button 
          onClick={() => (onOpenRecall ? onOpenRecall() : console.log("Open Options - Not Implemented"))}
          className="absolute top-5 right-5 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 font-bold flex items-center gap-2 border border-black/5 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          Options
        </button>

        <h1 className="text-6xl font-black mb-3 tracking-tight uppercase">{STATE_STYLE[state].title}</h1>
        <p className="text-xl font-semibold opacity-80">{STATE_STYLE[state].subtitle}</p>
        
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan(barcode)}
          className="absolute opacity-0 pointer-events-none"
          autoFocus
        />
      </div>

      {/* 2. MIDDLE SECTION: Customer Info */}
      <div className="min-h-0 flex flex-col">
        {customerInfo ? (
          <div className="bg-white border-l-[10px] border-blue-500 rounded-3xl p-6 shadow-lg flex flex-col gap-4 h-full min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
              <div className="lg:col-span-2">
                <p className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">Customer + Ticket</p>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 leading-none">
                      {customerInfo.first_name} {customerInfo.last_name}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-base text-slate-600">ID: {customerInfo.customer_identifier}</span>
                      <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-base text-slate-600">{customerInfo.phone_number}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-2xl font-bold text-base">Active Profile</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Ticket</div>
                <div className="mt-2 space-y-2 text-slate-700">
                  <Detail label="Display #" value={ticketMeta?.display_invoice_number ?? "—"} mono />
                  <Detail label="Pickup" value={fmtDate(ticketMeta?.invoice_pickup_date)} />
                  <Detail label="Items" value={ticketMeta?.number_of_items ?? garments.length} />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col min-h-0 h-full">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Garments</div>
                  <div className="text-slate-700 font-black">{garments.length}</div>
                </div>
                <div className="mt-3 flex-1 min-h-0 overflow-auto divide-y divide-slate-200">
                  {garments.length === 0 ? (
                    <div className="py-3 text-slate-500 text-sm">No garments found.</div>
                  ) : (
                    garments.map((g) => (
                      <div key={g.id} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm break-words">{g.item_description}</div>
                            <div className="text-[11px] text-slate-600 font-mono mt-1 break-all">Item ID: {g.item_id}</div>
                          </div>
                          <div className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-[11px] font-bold shrink-0">
                            Slot {g.slot_number}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-200/50 border-4 border-dashed border-slate-300 rounded-3xl h-full flex items-center justify-center">
            <span className="text-3xl text-slate-400 font-bold uppercase tracking-tighter opacity-50">Ready for next garment</span>
          </div>
        )}
      </div>

      {/* 3. BOTTOM SECTION: Stats + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-3 h-full min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 h-full">
          <StatBox label="Last Scan" value={lastScan ?? "---"} color="text-slate-500" />
          <StatBox label="Next Slot" value={nextSlot ?? "--"} color="text-green-600" border="border-b-8 border-green-500" />
          <StatBox label="Processed" value={scanCount} color="text-blue-600" border="border-b-8 border-blue-500" />
          <StatBox label="Tickets Completed" value={ticketsCompleted} color="text-slate-700" />
          <StatBox label="Conveyor Capacity" value={conveyorCapacity} color="text-slate-700" suffix="%" />
        </div>

        <div className="grid grid-cols-2 gap-3 h-full">
          <button
            onClick={openKeypad}
            className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-black text-white rounded-xl transition-all active:scale-95 shadow-lg h-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h.01M12 7h.01M17 7h.01M7 12h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01" />
            </svg>
            <span className="font-bold uppercase tracking-tighter text-xs">Manual Entry</span>
          </button>
          <button
            onClick={openClear}
            className="flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all active:scale-95 shadow-lg h-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 14h10l1-14" />
            </svg>
            <span className="font-bold uppercase tracking-tighter text-xs">Clear Conveyor</span>
          </button>
        </div>
      </div>

      {/* Keypad Modal (Condensed) */}
      {keypadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onMouseDown={(e) => e.target === e.currentTarget && closeKeypad()}>
          <div className="w-full max-w-sm rounded-[2.5rem] bg-white shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">BARCODE ENTRY</h3>
              <button onClick={closeKeypad} className="text-slate-400 hover:text-red-500 text-2xl">✕</button>
            </div>
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
              <span className="text-3xl font-mono font-bold tracking-widest text-blue-600">{manualCode || "---"}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["1","2","3","4","5","6","7","8","9","CLR","0","⌫"].map((k) => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className={`h-16 rounded-2xl text-2xl font-black transition-all active:scale-90 ${k === 'CLR' || k === '⌫' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white hover:bg-black'}`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button onClick={submitManual} disabled={manualCode.length < 4} className="w-full mt-6 py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xl font-black shadow-lg disabled:opacity-30">
              SUBMIT SCAN
            </button>
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

// Simple Helper Component for the Stats
function StatBox({ label, value, color, border = "", suffix = "" }: any) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow-md flex flex-col justify-center items-center ${border}`}>
      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-4xl font-black tracking-tighter ${color}`}>{value}{suffix}</span>
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

function Detail({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className={`text-slate-900 text-right min-w-0 break-words ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
