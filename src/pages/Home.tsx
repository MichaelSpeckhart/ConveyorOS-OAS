import { useEffect, useState } from "react";
import { loadSettings, type AppSettings } from "../lib/settings";
import { invoke } from "@tauri-apps/api/core";

// If you already have wrappers for these, use them instead of invoke():
// - opc_is_connected (bool)
// - load_sensor_hanger_tauri (bool)
// - get_target_slot (number)   (optional)
// - (optional) items_today / last_scan if you store them somewhere

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [opcConnected, setOpcConnected] = useState<boolean>(false);
  const [hanger, setHanger] = useState<boolean>(false);

  const [itemsToday, setItemsToday] = useState<number>(0);
  const [lastScan, setLastScan] = useState<string>("—");

  const [targetSlot, setTargetSlot] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const s = await loadSettings();
        if (alive) setSettings(s);
      } catch {
        // settings can fail if permissions aren’t set; don’t kill home screen
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        // OPTIONAL: implement these commands in Rust if you haven’t yet.
        const connected = await invoke<boolean>("opc_is_connected").catch(() => false);
        const hangerVal = await invoke<boolean>("load_sensor_hanger_tauri").catch(() => false);

        // Optional target slot command if you have it
        const slotVal = await invoke<number>("get_target_slot_tauri").catch(() => null);

        if (!alive) return;
        setOpcConnected(connected);
        setHanger(hangerVal);
        setTargetSlot(slotVal);
      } catch {
        // ignore
      }
    };

    tick();
    const id = setInterval(tick, 500); // refresh twice per second

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // quick “fake” stats until you wire them
  // replace these with your real app state if you have it
  // setItemsToday(...) and setLastScan(...) from scanner page storage later

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">Home</h1>
            <div className="text-slate-600 mt-1">
              Quick status + key stats
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/scanner"
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow"
            >
              Open Scanner
            </a>
            <a
              href="/settings"
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black shadow"
            >
              Settings
            </a>
          </div>
        </div>

        {/* Top status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatusCard
            title="OPC Connection"
            value={opcConnected ? "Connected" : "Disconnected"}
            pill={opcConnected ? "ok" : "bad"}
            subtitle="Live PLC link"
          />

          <StatusCard
            title="Hanger Sensor"
            value={hanger ? "TRUE" : "FALSE"}
            pill={hanger ? "warn" : "ok"}
            subtitle="Load hanger detect"
          />

          <StatusCard
            title="Target Slot"
            value={targetSlot ?? "—"}
            pill={targetSlot ? "ok" : "neutral"}
            subtitle="Current requested slot"
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BigStat title="Items Today" value={itemsToday} />
          <BigStat title="Last Scan" value={lastScan} mono />
          <BigStat
            title="POS CSV"
            value={settings?.posCsvDir ? "Configured" : "Not set"}
            subValue={settings?.posCsvDir || "Pick a CSV in Settings"}
          />
        </div>

        {/* Helpful details */}
        <div className="bg-white rounded-3xl shadow p-6">
          <div className="text-lg font-black text-slate-900 mb-3">Quick Details</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailRow label="POS CSV file" value={settings?.posCsvDir || "—"} />
            <DetailRow
              label="Database"
              value={
                settings
                  ? `${settings.dbHost}:${settings.dbPort} / ${settings.dbName} (user: ${settings.dbUser})`
                  : "—"
              }
            />
          </div>

          <div className="mt-5 text-sm text-slate-500">
            Tip: If OPC shows disconnected, check PLC network + endpoint URL in Settings.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard(props: {
  title: string;
  value: string | number;
  subtitle?: string;
  pill: "ok" | "bad" | "warn" | "neutral";
}) {
  const pillClass =
    props.pill === "ok"
      ? "bg-green-100 text-green-800"
      : props.pill === "bad"
      ? "bg-red-100 text-red-800"
      : props.pill === "warn"
      ? "bg-yellow-100 text-yellow-900"
      : "bg-slate-100 text-slate-800";

  return (
    <div className="bg-white rounded-3xl shadow p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-slate-500 font-bold text-sm uppercase tracking-widest">
            {props.title}
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{props.value}</div>
          {props.subtitle && <div className="text-slate-500 mt-1">{props.subtitle}</div>}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-black ${pillClass}`}>
          {props.pill.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function BigStat(props: { title: string; value: string | number; subValue?: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-3xl shadow p-6">
      <div className="text-slate-500 font-bold text-sm uppercase tracking-widest">
        {props.title}
      </div>
      <div className={`mt-2 text-5xl font-black text-slate-900 ${props.mono ? "font-mono" : ""}`}>
        {props.value}
      </div>
      {props.subValue && <div className="text-slate-600 mt-2 break-all">{props.subValue}</div>}
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
      <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">{props.label}</div>
      <div className="text-slate-900 font-mono mt-1 break-all">{props.value}</div>
    </div>
  );
}
