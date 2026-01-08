import { use, useEffect, useRef, useState } from "react";
import { getCustomerFromTicket, getNumItemsOnTicket, getSlotNumberFromBarcodeTauri, handleScanTauri, isLastGarmentTauri, loadSensorHanger, ticketExists } from "../../lib/slot_manager";
import { slotRunRequest, opcConnected } from "../../lib/opc";
import { listen } from "@tauri-apps/api/event";

type ScanState = "waiting" | "success" | "error" | "oneitem" | "garmentonconveyor" | "ticketcomplete" | "conveyordisconnected";

const STATE_STYLE = {
  waiting: {
    bg: "bg-yellow-400",
    text: "text-yellow-950",
    title: "WAITING FOR SCAN",
    subtitle: "Position barcode under scanner",
  },
  success: {
    bg: "bg-green-600",
    text: "text-white",
    title: "SCAN SUCCESS",
    subtitle: "Garment accepted and logged",
  },
  error: {
    bg: "bg-red-600",
    text: "text-white",
    title: "SCAN ERROR",
    subtitle: "Invalid barcode - please try again",
  },
  oneitem: {
    bg: "bg-yellow-400",
    text: "text-yellow-950",
    title: "SINGLE ITEM TICKET",
    subtitle: "DO NOT RACK ITEM",
  },
  garmentonconveyor: {
    bg: "bg-blue-600",
    text: "text-white",
    title: "GARMENT ON CONVEYOR",
    subtitle: "",
  },
  ticketcomplete: {
    bg: "bg-green-600",
    text: "text-white",
    title: "TICKET COMPLETE",
    subtitle: "REMOVE GARMENTS AND PROCEED",
  },
  conveyordisconnected: {
    bg: "bg-red-600",
    text: "text-white",
    title: "CONVEYOR DISCONNECTED",
    subtitle: "CHECK OPC CONNECTION",
  },
};

export default function GarmentScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [state, setState] = useState<ScanState>("waiting");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<null | any>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const hangerListenerRef = useRef<(() => void) | null>(null);
  let   [isConveyorConnected, setIsConveyorConnected] = useState(true);
  let   [nextSlot, setNextSlot] = useState<number | null>(null);

    const openKeypad = () => {
    setManualCode("");
    setKeypadOpen(true);
  };

  const closeKeypad = () => {
    setKeypadOpen(false);
    // return focus to scanner
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const pressKey = (k: string) => {
    if (k === "⌫") return setManualCode((s) => s.slice(0, -1));
    if (k === "CLR") return setManualCode("");
    setManualCode((s) => s + k);
  };

  const submitManual = async () => {
    const code = manualCode.trim();
    await handleScan(code);
    closeKeypad();
  };

  // Check if OPC is connected
  useEffect(() => {
    let interval = setInterval(async () => {
      if (await opcConnected() == false) {
        setState("conveyordisconnected");
        setIsConveyorConnected(false);
      } else {
        setIsConveyorConnected(true);
        setState("waiting");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);



  // Focus scanner input
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener("click", focusInput);
    return () => window.removeEventListener("click", focusInput);
  }, []);

  const reset = (delay = 1500) => {
    setTimeout(() => {
      setState("waiting");
      setCustomerInfo(null);
      setBarcode("");
    }, delay);
  };

  const handleScan = async (value: string) => {
    closeKeypad();
    const code = value.trim();
    if (!code || code.length < 4) {
      setState("error");
      reset();
      return;
    }

    if (!isConveyorConnected) {
      setState("conveyordisconnected");
      return;
    }

    const exists = await ticketExists(code);
    if (!exists) {

      setState("error");
      setCustomerInfo(null);
      return;
    }

    const numItems = await getNumItemsOnTicket(code);

    // if (numItems == 1) {
    //   setState("oneitem");
    //   const info = await getCustomerFromTicket(code);
    //   console.log("Customer Info:", info);
    //   setCustomerInfo(info);
    //   return;
    // }

    let isLast = await isLastGarmentTauri(code);

    if (isLast) {
      // Get the slot number for the ticket family
      setState("ticketcomplete");
      let slotNum = await getSlotNumberFromBarcodeTauri(code);  
      setNextSlot(slotNum);
      await slotRunRequest(slotNum!);
      return;
    }

    const info = await getCustomerFromTicket(code);
    setCustomerInfo(info);

    let slot_num = await handleScanTauri(code);
    console.log("Reserved Slot Number:", slot_num);
    setState("success");
    setLastScan(code);
    setScanCount((prev) => prev + 1);
    setNextSlot(slot_num);
    await slotRunRequest(slot_num!);

    let hanged = await loadSensorHanger();
    if (hanged) {
      setState("garmentonconveyor");
    } 
  };

  return (
    <div className="w-full  bg-slate-50 flex flex-col p-4 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col gap-4">
        
        {/* Main Status Hero - Massive for visibility */}
        <div className={`flex-shrink-0 h-[40vh] flex flex-col items-center justify-center rounded-2xl shadow-2xl transition-colors duration-300 ${STATE_STYLE[state].bg} ${STATE_STYLE[state].text}`}>
          <h1 className="text-6xl font-black mb-3 tracking-tight text-center">
            {STATE_STYLE[state].title}
          </h1>
          <p className="text-xl font-medium opacity-90">
            {STATE_STYLE[state].subtitle}
          </p>
          <input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleScan(barcode);
              }
            }}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />
        </div>

        {/* Customer Detail Card - High Contrast */}
        <div className="min-h-[250px]">
          {customerInfo ? (
            <div className="bg-white border-4 border-blue-500 rounded-3xl p-8 shadow-xl flex justify-between items-center">
              <div>
                <h2 className="text-blue-600 text-xl font-bold uppercase tracking-widest mb-2">Customer Profile</h2>
                <div className="text-5xl font-black text-slate-900">
                  {customerInfo.first_name} {customerInfo.last_name}
                </div>
                <div className="text-2xl text-slate-500 mt-2 font-mono">
                  ID: {customerInfo.customer_identifier} • {customerInfo.phone_number}
                </div>
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl">
                <div className="text-blue-600 text-sm font-bold uppercase">Status</div>
                <div className="text-2xl font-bold text-blue-900">Active Account</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-200 border-4 border-dashed border-slate-300 rounded-3xl p-8 flex items-center justify-center">
              <span className="text-2xl text-slate-400 font-bold uppercase tracking-widest">No Active Scan Data</span>
            </div>
          )}
        </div>

        {/* Bottom Stats & Utility Bar */}
        <div className="grid grid-cols-3 gap-6 h-32">
          <div className="bg-white rounded-2xl p-4 shadow-md flex flex-col justify-center items-center">
            <span className="text-slate-400 text-sm font-bold uppercase">Last Scan</span>
            <span className="text-3xl font-mono font-bold text-slate-800">{lastScan ?? "---"}</span>
          </div>

          {/* Next Slot Display */}
          <div className="bg-white rounded-2xl p-4 shadow-md flex flex-col justify-center items-center border-b-8 border-green-500">
            <span className="text-slate-400 text-sm font-bold uppercase">Next Slot</span>
            <span className="text-5xl font-black text-slate-900">{nextSlot !== null ? nextSlot : "--"}</span>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-md flex flex-col justify-center items-center border-b-8 border-blue-500">
            <span className="text-slate-400 text-sm font-bold uppercase">Items Processed</span>
            <span className="text-5xl font-black text-slate-900">{scanCount}</span>
          </div>

          <button
            onClick={openKeypad}
            className="bg-slate-800 hover:bg-black text-white rounded-2xl text-xl font-bold transition-all active:scale-95 shadow-lg"
          >
            Manual Entry
          </button>
        </div>
      </div>
      {keypadOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    onMouseDown={(e) => {
      // click outside closes
      if (e.target === e.currentTarget) closeKeypad();
    }}
  >
    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-black text-slate-900">Manual Barcode Entry</h3>
        <button
          onClick={closeKeypad}
          className="rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 font-bold"
        >
          ✕
        </button>
      </div>

      {/* Display */}
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 mb-4">
        <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
          Barcode
        </div>
        <div className="text-2xl font-mono font-bold text-slate-900 break-all min-h-[2.5rem]">
          {manualCode || "—"}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","CLR","0","⌫"].map((k) => (
          <button
            key={k}
            onClick={() => pressKey(k)}
            className={`rounded-2xl py-5 text-2xl font-black shadow-sm active:scale-[0.98] transition
              ${k === "CLR" ? "bg-slate-200 hover:bg-slate-300 text-slate-900" : ""}
              ${k === "⌫" ? "bg-slate-200 hover:bg-slate-300 text-slate-900" : ""}
              ${k !== "CLR" && k !== "⌫" ? "bg-slate-800 hover:bg-black text-white" : ""}
            `}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={closeKeypad}
          className="rounded-2xl py-4 text-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-900"
        >
          Cancel
        </button>
        <button
          onClick={submitManual}
          disabled={manualCode.trim().length < 4}
          className="rounded-2xl py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:hover:bg-blue-600"
        >
          Submit
        </button>
      </div>

      <div className="mt-3 text-sm text-slate-500">
        Tip: tap outside to close.
      </div>
    </div>
  </div>
)}

    </div>
  );
}