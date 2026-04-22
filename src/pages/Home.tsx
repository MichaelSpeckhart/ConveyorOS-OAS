import { useEffect, useState } from "react";
import { loadSettings, type AppSettings } from "../lib/settings";
import { invoke } from "@tauri-apps/api/core";

export default function HomePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [opcConnected, setOpcConnected] = useState(false);
  const [hanger, setHanger] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);

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
        const slotVal = await invoke<number>("get_target_slot_tauri").catch(() => null);
        if (!alive) return;
        setOpcConnected(connected);
        setHanger(hangerVal);
        setTargetSlot(slotVal);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="h-full overflow-auto bg-surface">

      {/* Hero */}
      <div className="bg-navy px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">ConveyorOS</p>
              <h1 className="text-5xl font-black text-white leading-none">Dashboard</h1>
              <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-black ${
                opcConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${opcConnected ? "bg-green-400" : "bg-red-400"}`} />
                {opcConnected ? "System Online" : "System Offline"}
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={() => onNavigate?.("scan")}
                className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-black shadow-lg transition-all text-center"
              >
                Open Scanner
              </button>
              <button
                onClick={() => onNavigate?.("settings")}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black transition-all text-center"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

        {/* Status Row */}
        <div className="grid grid-cols-3 gap-4">
          <StatusTile
            label="OPC / PLC"
            value={opcConnected ? "Connected" : "Disconnected"}
            on={opcConnected}
            onColor="bg-green-500"
            offColor="bg-red-500"
          />
          <StatusTile
            label="Hanger Sensor"
            value={hanger ? "Triggered" : "Clear"}
            on={!hanger}
            onColor="bg-green-500"
            offColor="bg-yellow-500"
          />
          <StatusTile
            label="Target Slot"
            value={targetSlot !== null ? `Slot ${targetSlot}` : "None"}
            on={targetSlot !== null}
            onColor="bg-blue-500"
            offColor="bg-slate-400"
          />
        </div>

        {/* Stats */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#ddd8d0]">
            <p className="text-sm font-bold text-slate-500">POS CSV Folder</p>
            <p className={`text-3xl font-extrabold mt-2 leading-none ${settings?.posCsvDir ? "text-green-600" : "text-slate-300"}`}>
              {settings?.posCsvDir ? "Configured" : "Not set"}
            </p>
            {settings?.posCsvDir && (
              <p className="text-xs text-slate-400 font-mono mt-2 break-all leading-snug">{settings.posCsvDir}</p>
            )}
          </div>
        </div>

        {/* Config */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#ddd8d0] divide-y divide-[#f0ede8]">
          <div className="px-6 py-4">
            <p className="text-sm font-bold text-slate-500">Configuration</p>
          </div>
          <ConfigRow label="POS CSV File" value={settings?.posCsvDir || "Not configured"} empty={!settings?.posCsvDir} />
          <ConfigRow
            label="Database"
            value={settings ? `${settings.dbHost}:${settings.dbPort} / ${settings.dbName}` : "Not configured"}
            empty={!settings}
          />
          <ConfigRow
            label="DB User"
            value={settings?.dbUser || "Not configured"}
            empty={!settings?.dbUser}
          />
        </div>

      </div>
    </div>
  );
}

function StatusTile({ label, value, on, onColor, offColor }: {
  label: string;
  value: string;
  on: boolean;
  onColor: string;
  offColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#ddd8d0]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <span className={`w-3 h-3 rounded-full ${on ? onColor : offColor}`} />
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  );
}

function ConfigRow({ label, value, empty }: { label: string; value: string; empty?: boolean }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-8">
      <p className="text-sm font-bold text-slate-500 shrink-0">{label}</p>
      <p className={`text-sm font-mono text-right break-all ${empty ? "text-slate-300" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
