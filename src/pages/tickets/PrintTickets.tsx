import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Printer, Search, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { TicketRow } from "../../lib/data";

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  if (s === "processed" || s === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-black bg-green-100 text-green-800">
        <CheckCircle2 size={11} />
        {status}
      </span>
    );
  }
  if (s === "processing") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-black bg-yellow-100 text-yellow-900">
        <Clock size={11} />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
      <AlertCircle size={11} />
      {status || "Unknown"}
    </span>
  );
}

export default function PrintTickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    const t = setTimeout(async () => {
      try {
        const rows = await invoke<TicketRow[]>("data_list_all_tickets", {
          query: search.trim() || null,
        });
        if (!alive) return;
        setTickets(rows);
      } catch (e) {
        if (!alive) return;
        setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search]);

  async function handlePrint() {
    if (!selected) return;
    setPrinting(true);
    setPrintResult(null);
    try {
      await invoke("print_ticket_tauri", { fullInvoiceNumber: selected.full_invoice_number });
      setPrintResult({ ok: true, msg: "Ticket sent to printer." });
    } catch (e) {
      setPrintResult({ ok: false, msg: String(e) });
    } finally {
      setPrinting(false);
    }
  }

  const progress = selected
    ? Math.round((selected.garments_processed / Math.max(selected.number_of_items, 1)) * 100)
    : 0;

  return (
    <div className="h-full w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Print Tickets</h1>
          <div className="text-slate-600">Select a ticket and print a receipt</div>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 font-bold">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-5rem)]">
        {/* Left: Ticket list */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-3">
              Tickets {!loading && <span className="text-slate-400">({tickets.length})</span>}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:bg-white transition"
                placeholder="Search invoice, name, phone, or status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loading && <div className="text-xs text-slate-500 mt-2">Loading…</div>}
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            {tickets.map((t) => {
              const isActive = selected?.id === t.id;
              const done = t.garments_processed >= t.number_of_items;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setPrintResult(null); }}
                  className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition ${
                    isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black text-slate-900">
                      #{t.display_invoice_number}
                    </div>
                    <div
                      className={`text-xs font-black px-2 py-1 rounded-full shrink-0 ${
                        done ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {t.garments_processed}/{t.number_of_items}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 mt-0.5">
                    {t.customer_first_name} {t.customer_last_name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-xs text-slate-500">Drop: {fmtDate(t.invoice_dropoff_date)}</div>
                    <div className="text-xs text-slate-500">Pick: {fmtDate(t.invoice_pickup_date)}</div>
                  </div>
                </button>
              );
            })}

            {!loading && tickets.length === 0 && (
              <div className="px-5 py-8 text-slate-500 text-center">No tickets found.</div>
            )}
          </div>
        </div>

        {/* Right: Ticket detail + print */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {selected ? (
            <>
              {/* Detail header */}
              <div className="px-6 py-5 border-b border-slate-200">
                <div className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-1">Ticket Detail</div>
                <div className="text-2xl font-black text-slate-900">#{selected.display_invoice_number}</div>
                <div className="text-slate-600 mt-0.5 font-mono text-xs">{selected.full_invoice_number}</div>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
                {/* Customer */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Customer</div>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-1">
                    <div className="font-black text-slate-900">
                      {selected.customer_first_name} {selected.customer_last_name}
                    </div>
                    <div className="text-sm text-slate-600 font-mono">{selected.customer_phone_number}</div>
                    <div className="text-xs text-slate-500">ID: {selected.customer_identifier}</div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Dates</div>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 font-bold">Drop-off</div>
                      <div className="text-sm font-black text-slate-900">{fmtDate(selected.invoice_dropoff_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold">Pick-up</div>
                      <div className="text-sm font-black text-slate-900">{fmtDate(selected.invoice_pickup_date)}</div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Processing</div>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={selected.ticket_status} />
                      <span className="text-sm font-black text-slate-900">
                        {selected.garments_processed}/{selected.number_of_items} items
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 text-right">{progress}% complete</div>
                  </div>
                </div>
              </div>

              {/* Print action */}
              <div className="px-6 py-5 border-t border-slate-200 space-y-3">
                {printResult && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                      printResult.ok
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}
                  >
                    {printResult.msg}
                  </div>
                )}
                <button
                  onClick={handlePrint}
                  disabled={printing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-base transition disabled:opacity-50"
                >
                  {printing ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Printing…
                    </>
                  ) : (
                    <>
                      <Printer size={18} />
                      Print Ticket
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12 text-slate-400">
              <Printer size={48} className="mb-4 opacity-30" />
              <div className="font-black text-lg text-slate-500">No ticket selected</div>
              <div className="text-sm mt-1">Choose a ticket from the list to print a receipt</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
