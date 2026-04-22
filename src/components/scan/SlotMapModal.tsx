import { useState } from "react";
import { slotRunRequest } from "../../lib/opc";
import type { Slot, SlotManagerStats } from "../../types/slotstats";

type Props = {
  open: boolean;
  onClose: () => void;
  slotStats: SlotManagerStats | null;
  slotMapData: Slot[];
  onRefresh: () => Promise<void>;
};

export default function SlotMapModal({ open, onClose, slotStats, slotMapData, onRefresh }: Props) {
  if (!open || !slotStats) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[85vh] rounded-[2.5rem] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Slot Map</h3>
            <p className="text-sm text-slate-400 font-semibold mt-0.5">
              {slotMapData.length} of {slotStats.total_slots} slots occupied &mdash;{" "}
              {Math.round(slotStats.capacity_percentage)}% full
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-2xl font-bold leading-none">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-5 px-8 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" /> Empty
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <div className="w-4 h-4 rounded bg-blue-500" /> Occupied
          </div>
        </div>

        <SlotMapGrid totalSlots={slotStats.total_slots} occupiedSlots={slotMapData} />

        <div className="flex justify-end px-8 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotMapGrid({ totalSlots, occupiedSlots }: { totalSlots: number; occupiedSlots: Slot[] }) {
  const [runningSlot, setRunningSlot] = useState<number | null>(null);

  const handleSlotClick = async (slotNum: number) => {
    if (runningSlot !== null) return;
    setRunningSlot(slotNum);
    try {
      await slotRunRequest(slotNum);
    } catch (err) {
      console.error(`slotRunRequest failed for slot ${slotNum}:`, err);
    } finally {
      setRunningSlot(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
        {Array.from({ length: totalSlots }, (_, i) => {
          const slotNum = i + 1;
          const occupied = occupiedSlots.find((s) => s.slot_number === slotNum);
          const isRunning = runningSlot === slotNum;
          return (
            <button
              key={slotNum}
              onClick={() => handleSlotClick(slotNum)}
              disabled={runningSlot !== null}
              title={occupied ? `Ticket: ${occupied.assigned_ticket ?? "—"} — Click to run` : "Empty — Click to run"}
              className={`relative flex flex-col items-center justify-center rounded-xl aspect-square text-center transition-all select-none
                active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed
                ${isRunning
                  ? "bg-amber-400 text-amber-900 shadow-md shadow-amber-200 animate-pulse"
                  : occupied
                    ? "bg-blue-500 text-white shadow-md shadow-blue-200 hover:bg-blue-600 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                }`}
            >
              <span className="text-lg font-black leading-none">{slotNum}</span>
              {occupied && !isRunning && (
                <span className="text-[9px] font-bold opacity-80 mt-0.5 px-1 leading-tight truncate w-full text-center">
                  {occupied.assigned_ticket ?? ""}
                </span>
              )}
              {isRunning && <span className="text-[9px] font-bold mt-0.5">Running…</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
