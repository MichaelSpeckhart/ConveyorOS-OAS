import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Customer {
    id: number;
    customer_identifier: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    created_at: string;
}

const report_groups = [
    {
        category: "Customer",
        reports: [
            "Customer Listing by Last Name",
            "Customer Listing by Customer ID",
        ],
    },
    {
        category: "Conveyor Inventory",
        reports: [
            "Conveyor Inventory by Customer ID",
            "Conveyor Inventory by Slot Number",
            "Conveyor Inventory by Ticket Number",
            "Conveyor Inventory by Load Time",
        ],
    },
    {
        category: "Conveyor Activity",
        reports: [
            "Conveyor Activity by Time",
            "Conveyor Activity by Slot",
            "Conveyor Activity by Customer ID",
            "Conveyor Activity by Action",
            "Conveyor Activity by Ticket ID",
            "Conveyor Activity by Garment ID",
        ],
    },
    {
        category: "Tickets & Alarms",
        reports: [
            "Ticket Detail",
            "Conveyor Alarms",
        ],
    },
];

export default function ReportsHome() {
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleReportClick(report: string) {
        if (report === "Customer Listing by Last Name") {
            setActiveReport(report);
            setLoading(true);
            setError(null);
            try {
                const result = await invoke<Customer[]>("get_customer_report_tauri");
                const sorted = [...result].sort((a, b) => a.last_name.localeCompare(b.last_name));
                setCustomers(sorted);
            } catch (e) {
                setError(String(e));
            } finally {
                setLoading(false);
            }
        }
        else if (report === "Customer Listing by Customer ID") {
            setActiveReport(report);
            setLoading(true);
            setError(null);
            try {
                const result = await invoke<Customer[]>("get_customer_report_by_id_tauri");
                // const sorted = [...result].sort((a, b) => a.last_name.localeCompare(b.last_name));
                setCustomers(result);
            } catch (e) {
                setError(String(e));
            } finally {
                setLoading(false);
            }
        }
    }

    function handleBack() {
        setActiveReport(null);
        setCustomers(null);
        setError(null);
    }

    if (activeReport) {
        return (
            <div className="h-full overflow-auto bg-surface">
                <div className="bg-navy px-8 py-10">
                    <div className="max-w-5xl mx-auto">
                        <button onClick={handleBack} className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2 hover:text-white transition-colors">
                            ← Reports
                        </button>
                        <h1 className="text-5xl font-black text-white leading-none mt-2">{activeReport}</h1>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-8 py-8">
                    {loading && <p className="text-slate-500 font-bold">Loading...</p>}
                    {error && <p className="text-red-500 font-bold">{error}</p>}
                    {customers && (
                        <div className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#ddd8d0]">
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Last Name</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">First Name</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Customer ID</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Phone</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((c, i) => (
                                        <tr
                                            key={c.id}
                                            className={`${i < customers.length - 1 ? "border-b border-[#f0ede8]" : ""} hover:bg-surface transition-colors`}
                                        >
                                            <td className="px-5 py-4 font-bold text-[#1a2a35]">{c.last_name}</td>
                                            <td className="px-5 py-4 text-[#1a2a35]">{c.first_name}</td>
                                            <td className="px-5 py-4 text-slate-500">{c.customer_identifier}</td>
                                            <td className="px-5 py-4 text-slate-500">{c.phone_number}</td>
                                            <td className="px-5 py-4 text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {customers.length === 0 && (
                                <p className="px-5 py-8 text-center text-slate-400 font-bold">No customers found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-surface">

            {/* Hero */}
            <div className="bg-navy px-8 py-10">
                <div className="max-w-5xl mx-auto">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">ConveyorOS</p>
                    <h1 className="text-5xl font-black text-white leading-none">Reports</h1>
                    <p className="text-slate-400 mt-3 font-bold">Select a report to generate</p>
                </div>
            </div>

            {/* Report groups */}
            <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {report_groups.map((group) => (
                    <div key={group.category} className="bg-white rounded-3xl border border-[#ddd8d0] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#ddd8d0]">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{group.category}</p>
                        </div>
                        <div>
                            {group.reports.map((report, i) => (
                                <button
                                    key={report}
                                    onClick={() => handleReportClick(report)}
                                    className={`w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-surface active:bg-blue-50 transition-colors group ${
                                        i < group.reports.length - 1 ? "border-b border-[#f0ede8]" : ""
                                    }`}
                                >
                                    <span className="font-bold text-[#1a2a35] group-hover:text-blue-600 transition-colors">
                                        {report}
                                    </span>
                                    <span className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0">›</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
