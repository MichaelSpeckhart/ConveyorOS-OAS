import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { clearAppLogs, getAppLogs, type AppLogEntry } from "../../lib/app_logs";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function LogPage() {
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const rows = await getAppLogs();
      setLogs(rows.slice().reverse());
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    setErr(null);
    try {
      await clearAppLogs();
      setLogs([]);
    } catch (e) {
      setErr(String(e));
    }
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-full w-full bg-surface p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow border border-slate-200 overflow-hidden">
          <div className="bg-navy px-8 py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-navy-muted font-black">Runtime</div>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">Logs</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="h-11 w-11 rounded-xl grid place-items-center bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                title="Refresh logs"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={clear}
                className="h-11 w-11 rounded-xl grid place-items-center bg-white/10 text-white hover:bg-red-500"
                title="Clear logs"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {err && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
                {err}
              </div>
            )}

            {logs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-green-50 text-green-700 grid place-items-center">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-xl font-black text-slate-900">No import errors this session</div>
                <div className="mt-2 text-sm font-semibold text-slate-500">
                  Logs are kept in memory and reset when the app closes.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-red-600">
                          {log.level} - {log.source}
                        </div>
                        <h2 className="mt-1 text-lg font-black text-red-950">{log.message}</h2>
                      </div>
                      <div className="text-xs font-bold text-red-700 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    {log.details && (
                      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        {log.details}
                      </pre>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
