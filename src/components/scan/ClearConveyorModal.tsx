import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ClearConveyorModal({ open, onClose, onConfirm }: Props) {
  const [sequence, setSequence] = useState("");

  if (!open) return null;

  const handleKey = (k: string) => {
    const next = (sequence + k).slice(-3);
    setSequence(next);
    if (next === "123") {
      setSequence("");
      onClose();
      onConfirm();
    }
  };

  const handleClose = () => {
    setSequence("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-sm rounded-[2.5rem] bg-white shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">CLEAR CONVEYOR</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-red-500 text-2xl">✕</button>
        </div>
        <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
          <span className="text-3xl font-mono font-bold tracking-widest text-red-600">
            {sequence.padEnd(3, "•")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3"].map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className="h-16 rounded-2xl text-2xl font-black transition-all active:scale-90 bg-slate-800 text-white hover:bg-black"
            >
              {k}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Press 1 → 2 → 3 to confirm clearing all conveyor slots.
        </p>
      </div>
    </div>
  );
}
