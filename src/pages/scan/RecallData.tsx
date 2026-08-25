{/* This Screen will show the data for the customer, ticket, and the garments. 
    The Customer and Ticket data will be displayed in a box at the top of the screen.
    The Garments will be displayed in a scrollable list below the customer/ticket box.
*/}

import { useEffect, useRef, useState } from "react";
import { Hanger, LaundryTag } from "../../components/icons/DryCleaningIcons";
import { getCustomerFromTicket, getTicketFromGarment, ticketExists } from "../../lib/slot_manager";
import { GarmentRow, listGarmentsForTicket, TicketRow } from "../../lib/data";

function fmtDate(s?: string) {
    if (!s) return "—";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
}

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function RecallData({ open, onClose }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [barcode, setBarcode] = useState<string>("");
    const [lastBarcode, setLastBarcode] = useState<string>("");
    const [customerData, setCustomerData] = useState<any>(null);
    const [garments, setGarments] = useState<GarmentRow[]>([]);
    const [ticketMeta, setTicketMeta] = useState<null | TicketRow>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const resetRecall = () => {
        setBarcode("");
        setLastBarcode("");
        setCustomerData(null);
        setGarments([]);
        setTicketMeta(null);
        setError("");
        setLoading(false);
    };

    const handleClose = () => {
        resetRecall();
        onClose();
    };

    useEffect(() => {
        if (!open) return;

        const focusInput = () => inputRef.current?.focus();
        focusInput();
        window.addEventListener("click", focusInput);
        return () => window.removeEventListener("click", focusInput);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    });

    const handleRecall = async (scanValue: string) => {
        const code = scanValue.trim();
        if (!code || loading) return;

        setLastBarcode(code);
        setError("");
        setLoading(true);
        setCustomerData(null);
        setGarments([]);
        setTicketMeta(null);

        try {
            const exists = await ticketExists(code);
            if (!exists) {
                setError("Garment barcode does not exist.");
                return;
            }

            const customer = await getCustomerFromTicket(code);
            if (customer) {
                setCustomerData(customer);
            } else {
                setError("No customer data found for this ticket.");
                return;
            }

            const ticket = await getTicketFromGarment(code);
            if (!ticket) {
                setError("No ticket found for this garment.");
                return;
            }
            setTicketMeta(ticket);
            const rows = await listGarmentsForTicket(ticket.full_invoice_number);
            setGarments(rows);
            
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="w-full max-w-6xl h-[min(840px,calc(100vh-48px))] bg-surface rounded-[2.5rem] shadow-2xl border border-[#ddd8d0] flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between gap-4 bg-navy px-8 py-5 flex-shrink-0">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-navy-muted font-black mb-1">Garment Lookup</div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">Recall Customer Data</h1>
                    </div>
                    <button
                        onClick={handleClose}
                        aria-label="Close recall popup"
                        className="h-14 w-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white text-3xl font-black leading-none flex items-center justify-center shrink-0"
                    >
                        ✕
                    </button>
                </div>

                <input
                    ref={inputRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void handleRecall(barcode);
                            setBarcode("");
                        }
                    }}
                    onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
                    className="absolute top-0 left-0 w-px h-px opacity-0"
                    autoFocus
                    autoComplete="off"
                />

                <div className="px-6 pt-5 flex-shrink-0">
                    <div className={`rounded-3xl shadow-sm p-5 border flex items-center justify-between gap-5 ${
                        error
                            ? "bg-red-50 border-red-200 text-red-800"
                            : loading
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : "bg-yellow-50 border-yellow-200 text-yellow-950"
                    }`}>
                        <div className="min-w-0">
                            <div className="text-xs uppercase tracking-widest font-black opacity-70">
                                {loading ? "Recalling" : error ? "Scan Error" : "Waiting For Scan"}
                            </div>
                            <div className="mt-1 text-3xl font-black leading-tight">
                                {loading ? "Looking up garment..." : error || "Position barcode under scanner"}
                            </div>
                            {lastBarcode && (
                                <div className="mt-2 text-sm font-mono font-bold opacity-80 break-all">Last scan: {lastBarcode}</div>
                            )}
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-white/65 border border-black/5 grid place-items-center shrink-0">
                            <LaundryTag size={34} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 px-6 pb-6 pt-5 overflow-hidden">
                    {customerData ? (
                        <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 overflow-auto lg:overflow-hidden">
                            <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden flex flex-col min-h-[360px] lg:min-h-0">
                                <div className="px-6 py-4 border-b border-[#f0ede8] flex items-center justify-between gap-4 flex-shrink-0">
                                    <div>
                                        <div className="text-xs uppercase tracking-widest text-slate-400 font-black">Garments</div>
                                        <div className="text-3xl text-slate-900 font-black leading-none mt-1">{garments.length}</div>
                                    </div>
                                    {ticketMeta?.display_invoice_number && (
                                        <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono font-black">
                                            {ticketMeta.display_invoice_number}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-h-0 overflow-auto divide-y divide-slate-100">
                                    {garments.length === 0 ? (
                                        <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-3 px-6 py-6 text-slate-400">
                                            <Hanger size={56} strokeWidth={1.5} />
                                            <span className="text-lg font-black uppercase tracking-tight">No garments found</span>
                                        </div>
                                    ) : (
                                        garments.map((g) => (
                                            <div key={g.id} className="px-6 py-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="font-black text-slate-900 truncate">{g.item_description}</div>
                                                        <div className="text-sm text-slate-600 font-mono mt-1 break-all">Item ID: {g.item_id}</div>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-lg text-sm font-black shrink-0 ${
                                                        g.slot_number === -1 ? "bg-slate-100 text-slate-400" : "bg-blue-50 border border-blue-200 text-blue-700"
                                                    }`}>
                                                        {g.slot_number === -1 ? "—" : `Slot ${g.slot_number}`}
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

                            <div className="min-h-0 flex flex-col gap-5 lg:overflow-auto">
                                <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm p-6 flex-shrink-0">
                                    <div className="text-xs uppercase tracking-widest text-slate-400 font-black">Customer</div>
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

                                <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm p-6 flex-shrink-0">
                                    <div className="text-xs uppercase tracking-widest text-slate-400 font-black">Ticket</div>
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
                        </div>
                    ) : (
                        <div className="h-full min-h-[320px] bg-white border-2 border-dashed border-[#ddd8d0] rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                            <Hanger size={72} strokeWidth={1.5} className="text-slate-200" />
                            <span className="text-4xl text-slate-300 font-black uppercase tracking-tighter">Ready for recall scan</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold shrink-0">{label}</div>
            <div className={`text-slate-900 text-right min-w-0 break-words ${mono ? "font-mono" : ""}`}>{value}</div>
        </div>
    );
}
