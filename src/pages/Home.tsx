import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Database, Printer, ScanLine, Search, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import logoBackground from "../assets/Logo1.png";
import { loadSettings, type AppSettings } from "../lib/settings";

export default function HomePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [opcConnected, setOpcConnected] = useState(false);
  const [hanger, setHanger] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await loadSettings();
        if (alive) setSettings(s);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const connected = await invoke<boolean>("check_opc_connection_tauri").catch(() => false);
        const hangerVal = await invoke<boolean>("load_sensor_hanger_tauri").catch(() => false);
        if (!alive) return;
        setOpcConnected(connected);
        setHanger(hangerVal);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 800);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const posConfigured = Boolean(settings?.posCsvDir);
  const readyToScan = opcConnected && !hanger && posConfigured;
  const statusMessage = getStatusMessage({ opcConnected, hanger, posConfigured });

  return (
    <div
      className="h-full overflow-auto bg-surface"
      style={{
        backgroundImage: `linear-gradient(rgba(240, 237, 232, 0.86), rgba(240, 237, 232, 0.94)), url(${logoBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="min-h-full max-w-5xl mx-auto px-8 py-10 flex items-center">
        <section className="w-full rounded-[2rem] border border-[#ddd8d0] bg-white/92 shadow-xl backdrop-blur-sm p-8">
          <div className="flex items-start justify-between gap-6 border-b border-[#f0ede8] pb-6">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">ConveyorOS</p>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight leading-none text-slate-900">
                Order Assembly
              </h1>
            </div>

            <StatusPill ready={readyToScan} message={statusMessage} />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-6 pt-6">
            <button
              onClick={() => onNavigate?.("scan")}
              className="min-h-[190px] rounded-3xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-lg border border-blue-700 flex items-center justify-center gap-6 transition-all"
            >
              <span className="h-20 w-20 rounded-2xl bg-white/15 grid place-items-center shrink-0">
                <ScanLine size={48} />
              </span>
              <span className="text-left">
                <span className="block text-5xl font-black uppercase tracking-tight leading-none">Scan Garments</span>
                <span className="block text-lg font-black uppercase tracking-tight text-blue-100 mt-2">Start order assembly</span>
              </span>
            </button>

            <div className="grid grid-rows-3 gap-3">
              <ActionButton
                label="Print"
                icon={<Printer size={26} />}
                onClick={() => onNavigate?.("print")}
              />
              <ActionButton
                label="Lookup"
                icon={<Search size={26} />}
                onClick={() => onNavigate?.("data")}
              />
              <ActionButton
                label={posConfigured ? "Settings" : "Set POS"}
                icon={posConfigured ? <Settings size={26} /> : <Database size={26} />}
                warning={!posConfigured}
                onClick={() => onNavigate?.("settings")}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function getStatusMessage({
  opcConnected,
  hanger,
  posConfigured,
}: {
  opcConnected: boolean;
  hanger: boolean;
  posConfigured: boolean;
}) {
  if (!opcConnected) return "Conveyor offline";
  if (hanger) return "Clear hanger sensor";
  if (!posConfigured) return "Set POS folder";
  return "Ready for next garment";
}

function StatusPill({ ready, message }: { ready: boolean; message: string }) {
  return (
    <div className={`min-h-12 rounded-2xl border px-4 py-2 flex items-center gap-3 shrink-0 ${
      ready
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-yellow-50 border-yellow-200 text-yellow-900"
    }`}>
      {ready ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
      <span className="text-sm font-black uppercase tracking-tight whitespace-nowrap">{message}</span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  warning = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  warning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-full min-h-14 rounded-2xl shadow-sm border flex items-center justify-start gap-3 px-4 transition-all active:scale-[0.98] ${
        warning
          ? "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-900"
          : "bg-white hover:bg-[#f8f6f2] border-[#ddd8d0] text-slate-800"
      }`}
    >
      <span className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${warning ? "bg-yellow-200" : "bg-slate-100"}`}>
        {icon}
      </span>
      <span className="text-xl font-black uppercase tracking-tight leading-none text-left">{label}</span>
    </button>
  );
}
