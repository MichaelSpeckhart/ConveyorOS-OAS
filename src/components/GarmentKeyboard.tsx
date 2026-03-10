type GarmentKeyboardProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClose?: () => void;
  title?: string;
  submitLabel?: string;
  minLength?: number;
};

const KEYS = [
  "1", "2", "3", "%",
  "4", "5", "6", "$",
  "7", "8", "9", "#",
  "@", "0", ".", "-",
  "/", "*", "CLR", "⌫",
];

const SPECIAL = new Set(["%", "$", "#", "@", ".", "-", "/", "*"]);
const CONTROL = new Set(["CLR", "⌫"]);

const GarmentKeyboard = ({
  value,
  onChange,
  onSubmit,
  onClose,
  title = "BARCODE ENTRY",
  submitLabel = "SUBMIT SCAN",
  minLength = 4,
}: GarmentKeyboardProps) => {
  const handleKey = (k: string) => {
    if (k === "⌫") { onChange(value.slice(0, -1)); return; }
    if (k === "CLR") { onChange(""); return; }
    onChange(value + k);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-sm rounded-[2.5rem] bg-white shadow-2xl p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-2xl leading-none">
              ✕
            </button>
          )}
        </div>

        {/* Display */}
        <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center min-h-[64px] flex items-center justify-center">
          <span className="text-3xl font-mono font-bold tracking-widest text-blue-600 break-all">
            {value || "---"}
          </span>
        </div>

        {/* Keys — 4 columns */}
        <div className="grid grid-cols-4 gap-2.5">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={`
                h-14 rounded-2xl text-xl font-black transition-all active:scale-90
                ${CONTROL.has(k)
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : SPECIAL.has(k)
                    ? "bg-slate-600 text-white hover:bg-slate-500"
                    : "bg-slate-800 text-white hover:bg-black"
                }
              `}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Submit */}
        {onSubmit && (
          <button
            onClick={onSubmit}
            disabled={value.length < minLength}
            className="w-full mt-5 py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xl font-black shadow-lg disabled:opacity-30 transition-all active:scale-95"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default GarmentKeyboard;
