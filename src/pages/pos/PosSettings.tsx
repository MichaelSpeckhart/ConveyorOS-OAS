import { useEffect, useState } from "react";
import { loadSettings, pickPosCsvFile, saveSettings, type AppSettings } from "../../lib/settings";

export default function SettingsPage() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-black">Settings</h1>

      {/* POS SETTINGS */}
      <section className="bg-white rounded-2xl p-6 shadow space-y-3">
        <h2 className="text-xl font-black">POS Settings</h2>

        <div className="flex gap-3 items-center">
          <button
            onClick={pickCsvFile}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold"
          >
            Choose CSV File
          </button>

          <div className="text-sm text-slate-700 break-all">
            {s.posCsvDir || "No file selected"}
          </div>
        </div>
      </section>

      {/* DB SETTINGS */}
      <section className="bg-white rounded-2xl p-6 shadow space-y-4">
        <h2 className="text-xl font-black">Database Settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-sm font-bold">Host</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={s.dbHost}
              onChange={(e) => setS({ ...s, dbHost: e.target.value })}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-bold">Port</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              type="number"
              value={s.dbPort}
              onChange={(e) => setS({ ...s, dbPort: Number(e.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-bold">DB Name</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={s.dbName}
              onChange={(e) => setS({ ...s, dbName: e.target.value })}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-bold">User</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={s.dbUser}
              onChange={(e) => setS({ ...s, dbUser: e.target.value })}
            />
          </label>

          <label className="space-y-1 col-span-2">
            <div className="text-sm font-bold">Password</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              type="password"
              value={s.dbPassword}
              onChange={(e) => setS({ ...s, dbPassword: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex gap-3 items-center">
        <button
          onClick={onSave}
          className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black"
        >
          Save Settings
        </button>

        {saved && <div className="text-green-700 font-bold">Saved.</div>}
        {err && <div className="text-red-700 font-bold">{err}</div>}
      </div>
    </div>
  );
}
