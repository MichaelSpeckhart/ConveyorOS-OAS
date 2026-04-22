import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { Printer, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { TicketRow, GarmentRow, listGarmentsForTicket } from "../../lib/data";

import { type TicketTemplateConfig, DEFAULT_TICKET_TEMPLATE as DEFAULT_TEMPLATE } from "../../types/printer";
import { fmtDate } from "../../lib/format";

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

// ── Ticket preview ────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  ticketNumber:       "Ticket",
  customerIdentifier: "Customer",
  customerName:       "Name",
  numItems:           "Items",
  dropoffDate:        "Drop-off",
  pickupDate:         "Pickup",
  comments:           "Notes",
};

function TicketPreview({
  ticket,
  garments,
  template,
}: {
  ticket: TicketRow;
  garments: GarmentRow[];
  template: TicketTemplateConfig;
}) {
  const enabled = template.fields.filter((f) => f.enabled);

  function valueFor(id: string): string {
    switch (id) {
      case "ticketNumber":       return ticket.display_invoice_number;
      case "customerIdentifier": return ticket.customer_identifier;
      case "customerName": {
        const name = `${ticket.customer_first_name} ${ticket.customer_last_name}`.trim();
        return name || "—";
      }
      case "numItems":    return `${ticket.number_of_items} items`;
      case "dropoffDate": return fmtDate(ticket.invoice_dropoff_date);
      case "pickupDate":  return fmtDate(ticket.invoice_pickup_date);
      case "comments":    return "—";
      case "itemList":
        return garments.length > 0
          ? garments.map((g) => `${g.item_id}  ${g.item_description}`).join("\n")
          : "(no garments loaded)";
      default: return "—";
    }
  }

  return (
    <div className="bg-white border border-[#ddd8d0] rounded-2xl p-3 font-mono text-[10px] leading-relaxed text-slate-800 shadow-sm">
      {template.headerText && (
        <>
          <div className="text-center font-bold text-[11px] uppercase tracking-wide">
            {template.headerText}
          </div>
          <div className="border-t border-dashed border-slate-300 my-1.5" />
        </>
      )}

      {enabled.map((field, i) => {
        const value = valueFor(field.id);
        const isLast = i === enabled.length - 1;

        if (field.id === "itemList") {
          return (
            <div key={field.id} className={!isLast ? "mb-1" : ""}>
              <div className="text-slate-400 uppercase text-[9px] tracking-wide mb-0.5">Garments</div>
              {value.split("\n").map((line, li) => (
                <div key={li} className="truncate">{line}</div>
              ))}
            </div>
          );
        }

        return (
          <div key={field.id} className={!isLast ? "mb-0.5" : ""}>
            {field.showBarcode ? (
              <div className="mb-1">
                <div>
                  <span className="text-slate-500">{FIELD_LABELS[field.id] ?? field.label}:</span>{" "}
                  {value}
                </div>
                <div className="text-[8px] tracking-[0.25em] text-slate-400 my-0.5">
                  ▌▌▌▌▌ ▌▌ ▌▌▌ ▌▌▌▌ ▌▌ ▌▌▌▌▌
                </div>
              </div>
            ) : (
              <div>
                <span className="text-slate-500">{FIELD_LABELS[field.id] ?? field.label}:</span>{" "}
                {value}
              </div>
            )}
          </div>
        );
      })}

      {template.footerText && (
        <>
          <div className="border-t border-dashed border-slate-300 my-1.5" />
          <div className="text-center text-slate-500">{template.footerText}</div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PrintTickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [garments, setGarments] = useState<GarmentRow[]>([]);
  const [template, setTemplate] = useState<TicketTemplateConfig>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load ticket template from settings on mount
  useEffect(() => {
    Store.load("settings.json")
      .then(async (store) => {
        const settings = await store.get<any>("app_settings");
        const tmpl = settings?.printer?.ticketTemplate;
        if (tmpl) setTemplate(tmpl);
      })
      .catch(() => {});
  }, []);

  // Ticket list with debounced search
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

  // Load garments when a ticket is selected
  useEffect(() => {
    if (!selected) { setGarments([]); return; }
    listGarmentsForTicket(selected.full_invoice_number)
      .then(setGarments)
      .catch(() => setGarments([]));
  }, [selected]);

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
    <div className="h-full w-full p-5 overflow-hidden flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-shrink-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Ticket list */}
        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-[#ddd8d0]">
            <div className="text-sm font-bold text-slate-500 mb-3">
              Tickets {!loading && <span className="text-slate-400">({tickets.length})</span>}
            </div>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-[#ddd8d0] bg-[#fafaf7] pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:bg-white transition"
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
                  className={`w-full text-left px-5 py-4 border-b border-[#f0ede8] hover:bg-surface transition ${
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

        {/* Right: Ticket detail + preview + print */}
        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden flex flex-col">
          {selected ? (
            <>
              {/* Detail header */}
              <div className="px-6 py-5 border-b border-[#ddd8d0]">
                <div className="text-sm font-bold text-slate-500 mb-1">Ticket Detail</div>
                <div className="text-2xl font-black text-slate-900">#{selected.display_invoice_number}</div>
                <div className="text-slate-600 mt-0.5 font-mono text-xs">{selected.full_invoice_number}</div>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
                {/* Customer */}
                <div>
                  <div className="text-sm font-bold text-slate-500 mb-2">Customer</div>
                  <div className="bg-surface rounded-2xl px-4 py-3 space-y-1">
                    <div className="font-black text-slate-900">
                      {selected.customer_first_name} {selected.customer_last_name}
                    </div>
                    <div className="text-sm text-slate-600 font-mono">{selected.customer_phone_number}</div>
                    <div className="text-xs text-slate-500">ID: {selected.customer_identifier}</div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <div className="text-sm font-bold text-slate-500 mb-2">Dates</div>
                  <div className="bg-surface rounded-2xl px-4 py-3 grid grid-cols-2 gap-3">
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
                  <div className="text-sm font-bold text-slate-500 mb-2">Processing</div>
                  <div className="bg-surface rounded-2xl px-4 py-3 space-y-2">
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

                {/* Print preview */}
                <div>
                  <div className="text-sm font-bold text-slate-500 mb-2">Print Preview</div>
                  <TicketPreview ticket={selected} garments={garments} template={template} />
                </div>
              </div>

              {/* Print action */}
              <div className="px-6 py-5 border-t border-[#ddd8d0] space-y-3">
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
