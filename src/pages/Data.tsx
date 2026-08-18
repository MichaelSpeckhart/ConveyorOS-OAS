import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  CustomerRow,
  GarmentRow,
  TicketRow,
  listCustomers,
  listGarmentsForTicket,
  listTicketsForCustomer,
  updateGarmentCode,
} from "../lib/data";
import { fmtDateTime as fmtDate } from "../lib/format";

export default function DataPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [garments, setGarments] = useState<GarmentRow[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingGarments, setLoadingGarments] = useState(false);
  const [editingGarmentId, setEditingGarmentId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [savingGarmentId, setSavingGarmentId] = useState<number | null>(null);
  const [garmentEditError, setGarmentEditError] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // customers
  useEffect(() => {
    let alive = true;
    setLoadingCustomers(true);
    setErr(null);

    const t = setTimeout(async () => {
      try {
        const rows = await listCustomers(search.trim() ? search.trim() : undefined);
        if (!alive) return;
        setCustomers(rows);
      } catch (e) {
        if (!alive) return;
        setErr(String(e));
      } finally {
        if (alive) setLoadingCustomers(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search]);

  // tickets for customer
  useEffect(() => {
    let alive = true;
    setTickets([]);
    setGarments([]);
    setSelectedTicket(null);
    setEditingGarmentId(null);
    setEditingCode("");
    setGarmentEditError(null);

    if (!selectedCustomer) return;

    (async () => {
      setLoadingTickets(true);
      setErr(null);
      try {
        const rows = await listTicketsForCustomer(selectedCustomer.customer_identifier);
        if (!alive) return;
        setTickets(rows);
      } catch (e) {
        if (!alive) return;
        setErr(String(e));
      } finally {
        if (alive) setLoadingTickets(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedCustomer]);

  // garments for ticket
  useEffect(() => {
    let alive = true;
    setGarments([]);
    setEditingGarmentId(null);
    setEditingCode("");
    setGarmentEditError(null);

    if (!selectedTicket) return;

    (async () => {
      setLoadingGarments(true);
      setErr(null);
      try {
        const rows = await listGarmentsForTicket(selectedTicket.full_invoice_number);
        if (!alive) return;
        setGarments(rows);
      } catch (e) {
        if (!alive) return;
        setErr(String(e));
      } finally {
        if (alive) setLoadingGarments(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedTicket]);

  const customerTitle = useMemo(() => {
    if (!selectedCustomer) return "Select a customer";
    return `${selectedCustomer.first_name} ${selectedCustomer.last_name} • ${selectedCustomer.phone_number}`;
  }, [selectedCustomer]);

  const ticketTitle = useMemo(() => {
    if (!selectedTicket) return "Select a ticket";
    return `${selectedTicket.display_invoice_number} (${selectedTicket.garments_processed}/${selectedTicket.number_of_items})`;
  }, [selectedTicket]);

  const startEditGarment = (garment: GarmentRow) => {
    setEditingGarmentId(garment.id);
    setEditingCode(garment.item_id);
    setGarmentEditError(null);
  };

  const cancelEditGarment = () => {
    setEditingGarmentId(null);
    setEditingCode("");
    setGarmentEditError(null);
  };

  const saveGarmentCode = async (garment: GarmentRow) => {
    const nextCode = editingCode.trim();

    if (!nextCode) {
      setGarmentEditError("Garment code is required.");
      return;
    }

    if (nextCode === garment.item_id) {
      cancelEditGarment();
      return;
    }

    setSavingGarmentId(garment.id);
    setGarmentEditError(null);

    try {
      const updated = await updateGarmentCode(garment.item_id, nextCode);
      setGarments((rows) => rows.map((row) => (row.id === garment.id ? updated : row)));
      cancelEditGarment();
    } catch (e) {
      setGarmentEditError(String(e));
    } finally {
      setSavingGarmentId(null);
    }
  };

  return (
    <div className="h-full w-full p-5 overflow-auto bg-surface">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Data</h1>
          <div className="text-slate-600">Customers → Tickets → Garments</div>
        </div>

        <div className="w-[420px] max-w-full">
          <input
            className="w-full rounded-2xl border border-[#ddd8d0] bg-white px-4 py-3 text-slate-900 shadow-sm"
            placeholder="Search customer name, phone, or identifier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loadingCustomers && <div className="text-sm text-slate-500 mt-2">Loading customers…</div>}
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 font-bold">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customers */}
        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ddd8d0]">
            <div className="text-sm font-bold text-slate-500">Customers</div>
            <div className="text-slate-900 font-black mt-1">{customers.length}</div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {customers.map((c) => {
              const active = selectedCustomer?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-5 py-4 border-b border-[#f0ede8] hover:bg-surface transition ${
                    active ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-black text-slate-900">
                    {c.first_name} {c.last_name}
                  </div>
                  <div className="text-sm text-slate-600 font-mono">{c.phone_number}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    ID: <span className="font-mono">{c.customer_identifier}</span>
                  </div>
                </button>
              );
            })}

            {!loadingCustomers && customers.length === 0 && (
              <div className="px-5 py-6 text-slate-500">No customers found.</div>
            )}
          </div>
        </div>

        {/* Tickets */}
        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ddd8d0]">
            <div className="text-sm font-bold text-slate-500">Tickets</div>
            <div className="text-slate-900 font-black mt-1">{customerTitle}</div>
            {loadingTickets && <div className="text-sm text-slate-500 mt-2">Loading tickets…</div>}
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {tickets.map((t) => {
              const active = selectedTicket?.id === t.id;
              const done = t.garments_processed >= t.number_of_items;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left px-5 py-4 border-b border-[#f0ede8] hover:bg-surface transition ${
                    active ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black text-slate-900">
                      {t.display_invoice_number}
                    </div>
                    <div
                      className={`text-xs font-black px-2 py-1 rounded-full ${
                        done ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {t.garments_processed}/{t.number_of_items}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 mt-1">
                    Dropoff: {fmtDate(t.invoice_dropoff_date)}
                  </div>
                  <div className="text-xs text-slate-600">
                    Pickup: {fmtDate(t.invoice_pickup_date)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono break-all">
                    {t.full_invoice_number}
                  </div>
                </button>
              );
            })}

            {!loadingTickets && selectedCustomer && tickets.length === 0 && (
              <div className="px-5 py-6 text-slate-500">No tickets found for this customer.</div>
            )}

            {!selectedCustomer && (
              <div className="px-5 py-6 text-slate-500">Select a customer to see tickets.</div>
            )}
          </div>
        </div>

        {/* Garments */}
        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ddd8d0]">
            <div className="text-sm font-bold text-slate-500">Garments</div>
            <div className="text-slate-900 font-black mt-1">{ticketTitle}</div>
            {loadingGarments && <div className="text-sm text-slate-500 mt-2">Loading garments…</div>}
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {garments.map((g) => {
              const editing = editingGarmentId === g.id;
              const saving = savingGarmentId === g.id;

              return (
                <div key={g.id} className="px-5 py-4 border-b border-[#f0ede8]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-black text-slate-900">{g.item_description}</div>
                    <div className="text-xs font-black px-2 py-1 rounded-full bg-slate-100 text-slate-800">
                      Slot {g.slot_number}
                    </div>
                  </div>
                  {editing ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                          value={editingCode}
                          onChange={(e) => {
                            setEditingCode(e.target.value);
                            setGarmentEditError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveGarmentCode(g);
                            }
                            if (e.key === "Escape") cancelEditGarment();
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          title="Save garment code"
                          aria-label="Save garment code"
                          disabled={saving}
                          onClick={() => saveGarmentCode(g)}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          disabled={saving}
                          onClick={cancelEditGarment}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {garmentEditError && (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                          {garmentEditError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="min-w-0 text-sm text-slate-600 font-mono break-all">
                        Item: {g.item_id}
                      </div>
                      <button
                        type="button"
                        title="Edit garment code"
                        aria-label="Edit garment code"
                        onClick={() => startEditGarment(g)}
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}
                  {g.invoice_comments?.trim() && (
                    <div className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">
                      {g.invoice_comments}
                    </div>
                  )}
                </div>
              );
            })}

            {!loadingGarments && selectedTicket && garments.length === 0 && (
              <div className="px-5 py-6 text-slate-500">No garments found for this ticket.</div>
            )}

            {!selectedTicket && (
              <div className="px-5 py-6 text-slate-500">Select a ticket to see garments.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
