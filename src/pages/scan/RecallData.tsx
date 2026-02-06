{/* This Screen will show the data for the customer, ticket, and the garments. 
    The Customer and Ticket data will be displayed in a box at the top of the screen.
    The Garments will be displayed in a scrollable list below the customer/ticket box.
*/}

import  { useState } from "react";
import { getCustomerFromTicket, getTicketFromGarment, ticketExists } from "../../lib/slot_manager";
import { GarmentRow, listGarmentsForTicket, TicketRow } from "../../lib/data";

function fmtDate(s?: string) {
    if (!s) return "—";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function RecallData() {
    const [barcode, setBarcode] = useState<string>("");
    const [customerData, setCustomerData] = useState<any>(null);
    const [garments, setGarments] = useState<GarmentRow[]>([]);
    const [ticketMeta, setTicketMeta] = useState<null | TicketRow>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleRecall = async () => {
        setError("");
        setLoading(true);
        setCustomerData(null);
        setGarments([]);
        setTicketMeta(null);
        const exists = await ticketExists(barcode);
        if (!exists) {
            setError("Garment barcode does not exist.");
            setLoading(false);
            return;
        }
        const customer = await getCustomerFromTicket(barcode);
        if (customer) {
            setCustomerData(customer);
        } else {
            setError("No customer data found for this ticket.");
            setLoading(false);
            return;
        }

        try {
            const ticket = await getTicketFromGarment(barcode);
            if (!ticket) {
                setError("No ticket found for this garment.");
                setLoading(false);
                return;
            }
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            setGarments(rows);
            
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-slate-50 p-6 overflow-hidden">
            <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 min-h-0">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Recall Customer Data</h1>
                        <div className="text-slate-600">Scan or enter a garment barcode to pull ticket details.</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow p-5 flex flex-col md:flex-row gap-4 items-center">
                    <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Enter Garment Barcode"
                        className="w-full md:flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                    />
                    <button
                        onClick={handleRecall}
                        disabled={loading || !barcode.trim()}
                        className="w-full md:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow disabled:opacity-50 disabled:hover:bg-blue-600"
                    >
                        {loading ? "Recalling..." : "Recall"}
                    </button>
                </div>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 font-bold">
                        {error}
                    </div>
                )}

                {customerData && (
                    <div className="flex-1 min-h-0 flex flex-col gap-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                                <div className="text-sm uppercase tracking-widest text-slate-500 font-bold">Customer</div>
                                <div className="mt-3">
                                    <div className="text-2xl font-black text-slate-900">
                                        {customerData.first_name} {customerData.last_name}
                                    </div>
                                    <div className="mt-4 space-y-2 text-slate-700">
                                        <Detail label="Phone" value={customerData.phone_number} mono />
                                        <Detail label="Customer ID" value={customerData.customer_identifier} mono />
                                        {customerData.created_at && (
                                            <Detail label="Created" value={fmtDate(customerData.created_at)} />
                                        )}
                                        {customerData.email && <Detail label="Email" value={customerData.email} />}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                                <div className="text-sm uppercase tracking-widest text-slate-500 font-bold">Ticket</div>
                                <div className="mt-4 space-y-2 text-slate-700">
                                    <Detail label="Display #" value={ticketMeta?.display_invoice_number ?? "—"} mono />
                                    <Detail label="Full #" value={ticketMeta?.full_invoice_number ?? "—"} mono />
                                    <Detail label="Status" value={ticketMeta?.ticket_status ?? "—"} />
                                    <Detail label="Dropoff" value={fmtDate(ticketMeta?.invoice_dropoff_date)} />
                                    <Detail label="Pickup" value={fmtDate(ticketMeta?.invoice_pickup_date)} />
                                    <Detail label="Items" value={ticketMeta?.number_of_items ?? garments.length} />
                                    <Detail label="Processed" value={ticketMeta?.garments_processed ?? 0} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <div className="text-sm uppercase tracking-widest text-slate-500 font-bold">Garments</div>
                                <div className="text-slate-900 font-black mt-1">{garments.length}</div>
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto divide-y divide-slate-100">
                                {garments.length === 0 ? (
                                    <div className="px-6 py-6 text-slate-500">No garments found for this ticket.</div>
                                ) : (
                                    garments.map((g) => (
                                        <div key={g.id} className="px-6 py-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="font-black text-slate-900">{g.item_description}</div>
                                                    <div className="text-sm text-slate-600 font-mono mt-1">Item ID: {g.item_id}</div>
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                                                    Slot {g.slot_number}
                                                </div>
                                            </div>
                                            {g.invoice_comments?.trim() && (
                                                <div className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                                                    {g.invoice_comments}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Detail({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">{label}</div>
            <div className={`text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</div>
        </div>
    );
}
