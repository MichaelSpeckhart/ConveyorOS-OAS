import { useEffect, useState } from "react";
import { loadSettings, pickPosCsvFile, saveSettings, type AppSettings } from "../../lib/settings";

export default function SettingsPage() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [section, setSection] = useState<"pos" | "db" | "opc">("pos");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const settings = await loadSettings();
        if (alive) setS(settings);
      } catch (e) {
        console.error("FAILED loadSettings:", e);
        if (alive) setErr(String(e));
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (err) return <div className="p-6 text-red-600 font-bold">{err}</div>;
  if (!s) return <div className="p-6">Loading…</div>;

  const pickCsvFile = async () => {
    setErr(null);
    try {
      const path = await pickPosCsvFile(); // returns string | null
      if (path) setS((prev) => (prev ? { ...prev, posCsvDir: path } : prev));
    } catch (e) {
      console.error("FAILED pickPosCsvFile:", e);
      setErr(String(e));
    }
  };

  const onSave = async () => {
    setErr(null);
    setSaved(false);

    if (!s.posCsvDir) return setErr("Pick the POS CSV file.");
    if (!s.dbName || !s.dbUser) return setErr("DB name and user are required.");

    try {
      await saveSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("FAILED saveSettings:", e);
      setErr(String(e));
    }
  };

  return (
    <div className="min-h-full w-full bg-slate-50 p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow p-8 md:p-10 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">System</div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">POS Settings</h1>
            </div>
            <div className="flex gap-2 bg-white rounded-2xl p-2 shadow border border-slate-200">
              <button
                onClick={() => setSection("pos")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${section === "pos" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
              >
                POS
              </button>
              <button
                onClick={() => setSection("db")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${section === "db" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
              >
                Database
              </button>
              <button
                onClick={() => setSection("opc")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${section === "opc" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
              >
                OPC
              </button>
            </div>
          </div>

          <div className="min-h-[360px]">
            {section === "pos" && (
              <section className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">POS Settings</div>
              <h2 className="text-2xl font-black text-slate-900">CSV Import</h2>
              <div className="bg-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 border border-slate-200 shadow">
                <button
                  onClick={pickCsvFile}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-md hover:bg-black"
                >
                  Choose CSV File
                </button>
                <div className="text-sm text-slate-600 break-all">
                  {s.posCsvDir || "No file selected"}
                </div>
              </div>
              </section>
            )}

            {section === "db" && (
              <section className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">Database Settings</div>
              <h2 className="text-2xl font-black text-slate-900">Connection</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Host</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={s.dbHost}
                    onChange={(e) => setS({ ...s, dbHost: e.target.value })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Port</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    type="number"
                    value={s.dbPort}
                    onChange={(e) => setS({ ...s, dbPort: Number(e.target.value) })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">DB Name</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={s.dbName}
                    onChange={(e) => setS({ ...s, dbName: e.target.value })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">User</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={s.dbUser}
                    onChange={(e) => setS({ ...s, dbUser: e.target.value })}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    type="password"
                    value={s.dbPassword}
                    onChange={(e) => setS({ ...s, dbPassword: e.target.value })}
                  />
                </label>
              </div>
              </section>
            )}

            {section === "opc" && (
              <section className="space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">OPC Server</div>
              <h2 className="text-2xl font-black text-slate-900">Connectivity</h2>
              <div className="grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Server URL</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={s.opcServerUrl || ""}
                    onChange={(e) => setS({ ...s, opcServerUrl: e.target.value })}
                  />
                </label>
              </div>
              </section>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onSave}
              className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-md hover:bg-black"
            >
              Save Settings
            </button>
            {saved && (
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-700">
                Saved.
              </div>
            )}
            {err && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700">
                {err}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Choose a section above to configure your system settings.
        </div>
      </div>
    </div>
  );
}
