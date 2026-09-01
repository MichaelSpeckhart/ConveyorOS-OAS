import { useEffect, useRef, useState } from "react";
import { Ban } from "lucide-react";
import garmentRecallIcon from "../../assets/GarmentRecall.png";
import { GarmentRail, Hanger, LaundryTag, RailUnload } from "../../components/icons/DryCleaningIcons";
import GarmentKeyboard from "../../components/GarmentKeyboard";
import TicketAckModal from "../../components/scan/TicketAckModal";
import ClearConveyorModal from "../../components/scan/ClearConveyorModal";
import SlotMapModal from "../../components/scan/SlotMapModal";
import RecallData from "./RecallData";
import { useScanHandler, type ScanState } from "../../hooks/useScanHandler";
import { fmtDate } from "../../lib/format";
import { playScanAudioCue } from "../../lib/scanAudio";
import type { GarmentRow } from "../../lib/data";

const STATE_STYLE: Record<ScanState, { bg: string; text: string; title: string; subtitle: string }> = {
  waiting:         { bg: "bg-yellow-400",  text: "text-yellow-950", title: "WAITING FOR SCAN",          subtitle: "Position barcode under scanner"     },
  success:         { bg: "bg-green-600",   text: "text-white",      title: "SCAN SUCCESS",               subtitle: "Garment accepted and logged"        },
  error:           { bg: "bg-red-600",     text: "text-white",      title: "SCAN ERROR",                 subtitle: "Invalid barcode - please try again" },
  oneitem:         { bg: "bg-green-600",   text: "text-white",      title: "SINGLE ITEM TICKET",         subtitle: "DO NOT RACK ITEM"                   },
  garmentonconveyor: { bg: "bg-blue-600",  text: "text-white",      title: "GARMENT ON CONVEYOR",        subtitle: ""                                   },
  ticketcomplete:  { bg: "bg-green-600",   text: "text-white",      title: "TICKET COMPLETE",            subtitle: "REMOVE GARMENTS AND PROCEED"        },
  removegarment:   { bg: "bg-red-600",     text: "text-white",      title: "REMOVE GARMENT",             subtitle: "Please remove garments from conveyor" },
};

// Capacity is "—" until slot stats load, which gets the neutral treatment.
function capacityStyle(pct: number | string): { color: string; border: string } {
  if (typeof pct !== "number") return { color: "text-slate-900", border: "" };
  if (pct >= 80) return { color: "text-red-600",   border: "border-b-[6px] border-red-500"   };
  if (pct >= 50) return { color: "text-amber-600", border: "border-b-[6px] border-amber-500" };
  return { color: "text-green-600", border: "border-b-[6px] border-green-500" };
}

export default function GarmentScanner({
  sessionId,
  username,
}: {
  sessionId?: number | null;
  username?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPlayedAudioCueId = useRef<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [slotMapOpen, setSlotMapOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);

  const {
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
    queueRejected,
    scanAudioCue,
    isClearingConveyor,
    cancelableScan,
    isCancelingScan,
    handleScan,
    handleCancelScan,
    handleClearAndReset,
    handleNextClear,
    handleTicketAck,
    refreshSlotMap,
    openSlotMap,
  } = useScanHandler({ sessionId });

  useEffect(() => {
    if (keypadOpen || clearOpen || slotMapOpen || recallOpen || ticketAckOpen || isClearingConveyor) return;

    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener("click", focusInput);
    return () => window.removeEventListener("click", focusInput);
  }, [keypadOpen, clearOpen, slotMapOpen, recallOpen, ticketAckOpen, isClearingConveyor]);

  useEffect(() => {
    if (!scanAudioCue) return;
    if (lastPlayedAudioCueId.current === scanAudioCue.id) return;

    lastPlayedAudioCueId.current = scanAudioCue.id;
    playScanAudioCue(scanAudioCue.name);
  }, [scanAudioCue]);

  const openKeypad = () => { setManualCode(""); setKeypadOpen(true); };
  const closeKeypad = () => { setKeypadOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const openClear = () => setClearOpen(true);
  const closeClear = () => { setClearOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const handleOpenSlotMap = async () => { await openSlotMap(); setSlotMapOpen(true); };
  const closeSlotMap = () => { setSlotMapOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const openRecall = () => setRecallOpen(true);
  const closeRecall = () => { setRecallOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };
  const scannerInputPaused = keypadOpen || clearOpen || slotMapOpen || recallOpen || ticketAckOpen || isClearingConveyor;

  // Enqueueing is synchronous now, so the keypad closes immediately instead of
  // hanging until the conveyor finishes travelling.
  const submitManual = () => { handleScan(manualCode); closeKeypad(); };

  return (
    <div className="flex-1 bg-surface grid grid-rows-[32vh,1fr,132px] p-5 gap-5 overflow-hidden h-full min-h-0">

      {/* Status hero */}
      <div className={`relative flex flex-col items-center justify-center rounded-3xl shadow-xl transition-all duration-300 ${STATE_STYLE[state].bg} ${STATE_STYLE[state].text}`}>

        {/* Queue indicator — confirms a scan landed even though the conveyor is busy */}
        {scanQueue.length > 0 && (
          <div className="absolute top-5 left-5 bg-black/15 border border-black/5 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-3">
            <Hanger size={24} />
            <span className="text-3xl font-black tabular-nums leading-none">{scanQueue.length}</span>
            <span className="text-sm font-black uppercase tracking-widest opacity-80 leading-none">
              Queued
            </span>
          </div>
        )}

        {queueRejected && (
          <div className="absolute bottom-5 left-5 bg-black/25 border border-white/20 rounded-xl px-4 py-2">
            <span className="text-sm font-black uppercase tracking-widest">Queue full — hang a garment first</span>
          </div>
        )}

        {/* Options dropdown */}
        <div className="absolute top-5 right-5">
          <button
            onClick={() => setOptionsOpen((o) => !o)}
            className="bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 font-bold flex items-center gap-2 border border-black/5 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
            Options
          </button>
          {optionsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOptionsOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden min-w-[200px]">
                <button
                  onClick={() => { setOptionsOpen(false); handleOpenSlotMap(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 font-bold text-sm text-left"
                >
                  <GarmentRail size={19} />
                  Slot Map
                </button>
              </div>
            </>
          )}
        </div>

        <h1 className="text-8xl font-black mb-3 tracking-tight uppercase">{STATE_STYLE[state].title}</h1>
        <p className="text-2xl font-black opacity-80">{STATE_STYLE[state].subtitle}</p>

        {cancelableScan && (
          <button
            onClick={handleCancelScan}
            disabled={isCancelingScan}
            className="absolute bottom-5 right-5 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-wait font-black text-lg px-6 py-4 rounded-2xl shadow-lg border-2 border-white/70 active:scale-95 transition-all flex items-center gap-3"
          >
            <Ban size={24} strokeWidth={3} />
            {isCancelingScan ? "Canceling..." : "Cancel Scan"}
          </button>
        )}

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
  onKeyDown={(e) => { 
    if (scannerInputPaused) return;
    if (e.key === "Enter") { 
      e.preventDefault();
      handleScan(barcode); 
      setBarcode(""); 
    } 
  }}
  onBlur={() => {
    if (!scannerInputPaused) setTimeout(() => inputRef.current?.focus(), 0);
  }}
  className="absolute top-0 left-0 w-px h-px opacity-0"
  autoFocus
  autoComplete="off"
  disabled={scannerInputPaused}
/>
      </div>

      {/* Customer info + garment list (left) and current slot (right) */}
      <div className="grid grid-cols-[1fr_320px] gap-5 min-h-0">
        <div className="min-h-0 flex flex-col">
          {customerInfo ? (
            <div className="bg-white border border-[#ddd8d0] rounded-3xl p-5 shadow-sm flex flex-col gap-4 h-full min-h-0 overflow-hidden">
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
              <GarmentList garments={garments} lastScan={lastScan} />
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#ddd8d0] rounded-3xl h-full flex flex-col items-center justify-center gap-4">
              <Hanger size={72} strokeWidth={1.5} className="text-slate-200" />
              <span className="text-4xl text-slate-300 font-black uppercase tracking-tighter">Ready for next garment</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <SlotDisplay garments={garments} lastScan={lastScan} />
          </div>
          <ScanQueue queue={scanQueue} />
        </div>
      </div>

      {/* Stats + manual entry */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,364px] gap-3 h-full min-h-0">
        <div className="grid grid-cols-4 gap-3 h-full">
          <StatBox label="Tickets Completed" value={ticketsCompleted} color="text-green-600" border="border-b-[6px] border-green-500" />
          <StatBox label="Garments Scanned"  value={scanCount}        color="text-blue-600"  border="border-b-[6px] border-blue-500"  />
          <StatBox label="Conveyor Capacity"  value={conveyorCapacity} suffix="%" {...capacityStyle(conveyorCapacity)} />
          <StatBox label="Operator"          value={username ?? "—"}  color="text-purple-600" border="border-b-[6px] border-purple-500" valueSize="text-3xl" />
        </div>
        <div className="flex items-stretch gap-3 h-full">
          <button
            onClick={openKeypad}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-[#f0ede8] text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm border border-[#ddd8d0] h-full"
          >
            <LaundryTag size={30} />
            <span className="font-black uppercase tracking-tighter text-sm">Manual Entry</span>
          </button>
          <button
            onClick={openRecall}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-[#f0ede8] text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm border border-[#ddd8d0] h-full"
          >
            <img src={garmentRecallIcon} alt="" draggable={false} className="h-[30px] w-[30px] object-contain pointer-events-none" />
            <span className="font-black uppercase tracking-tighter text-sm">Recall</span>
          </button>
          <button
            onClick={openClear}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-red-50 text-red-600 rounded-2xl transition-all active:scale-95 shadow-sm border border-[#ddd8d0] h-full"
          >
            <RailUnload size={30} />
            <span className="font-black uppercase tracking-tighter text-sm leading-tight text-center">Clear<br />Conveyor</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {keypadOpen && (
        <GarmentKeyboard value={manualCode} onChange={setManualCode} onSubmit={submitManual} onClose={closeKeypad} />
      )}

      <SlotMapModal
        open={slotMapOpen}
        onClose={closeSlotMap}
        slotStats={slotStats}
        slotMapData={slotMapData}
        onRefresh={refreshSlotMap}
      />

      <TicketAckModal open={ticketAckOpen} data={ticketAckData} onAck={handleTicketAck} />

      <ClearConveyorModal open={clearOpen} onClose={closeClear} onConfirm={handleClearAndReset} />

      <RecallData open={recallOpen} onClose={closeRecall} />
    </div>
  );
}

function GarmentList({ garments, lastScan }: { garments: GarmentRow[]; lastScan: string | null }) {
  if (garments.length === 0) {
    return <div className="py-4 text-slate-400 text-sm text-center">No garments on this ticket.</div>;
  }
  
  return (
    <div className="flex-1 min-h-0 overflow-auto divide-y divide-slate-100">
      {garments.map((g) => (
        <div
          key={g.id}
          className={`py-2.5 flex items-center justify-between gap-3 ${g.item_id === lastScan ? "bg-green-50 -mx-1 px-1 rounded-lg" : ""}`}
        >
          <div className="font-semibold text-slate-800 text-sm">{g.item_description}</div>
          <div className={`px-3 py-1 rounded-lg text-sm font-black shrink-0 ${
            g.slot_number === -1 ? "bg-slate-100 text-slate-400" : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}>
            {g.slot_number === -1 ? "—" : `Slot ${g.slot_number}`}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Garments scanned ahead of the conveyor, in the order they'll be racked. */
function ScanQueue({ queue }: { queue: string[] }) {
  if (queue.length === 0) return null;

  const shown = queue.slice(0, 3);

  return (
    <div className="bg-white border border-[#ddd8d0] rounded-3xl shadow-sm p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Up Next</span>
        <span className="text-2xl font-black text-slate-900 leading-none tabular-nums">{queue.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {shown.map((code, i) => (
          <div key={code} className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-sm font-black grid place-items-center shrink-0 tabular-nums">
              {i + 1}
            </span>
            <span className="font-mono text-sm text-slate-700 truncate">{code}</span>
          </div>
        ))}
        {queue.length > shown.length && (
          <span className="text-xs text-slate-400 font-bold pl-[38px]">
            +{queue.length - shown.length} more
          </span>
        )}
      </div>
    </div>
  );
}

function SlotDisplay({ garments, lastScan }: { garments: GarmentRow[]; lastScan: string | null }) {
  const current = garments.find((g) => g.item_id === lastScan);
  if (current) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl shadow-sm flex flex-col items-center justify-center h-full min-h-0">
        <div className="text-5xl uppercase tracking-widest text-green-600 font-bold mb-3">Slot</div>
        <div className="text-[10rem] font-black text-green-700 leading-none">
          {current.slot_number === -1 ? "—" : current.slot_number}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[#f0ede8] border-2 border-dashed border-[#ddd8d0] rounded-3xl h-full flex flex-col items-center justify-center">
      <div className="text-5xl uppercase tracking-widest text-slate-400 font-bold mb-3">Slot</div>
      <div className="text-[10rem] font-black text-slate-300 leading-none">—</div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  border = "",
  suffix = "",
  valueSize = "text-5xl",
}: {
  label: string;
  value: number | string;
  color: string;
  border?: string;
  suffix?: string;
  valueSize?: string;
}) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border border-[#ddd8d0] flex flex-col justify-center items-center ${border}`}>
      <span className="text-slate-900 text-base font-black uppercase tracking-widest mb-1">{label}</span>
      <span className={`${valueSize} font-black tracking-tighter ${color} max-w-full truncate`}>{value}{suffix}</span>
    </div>
  );
}
