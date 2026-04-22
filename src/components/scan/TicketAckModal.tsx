type TicketAckData = {
  ticketNum: string;
  customerName: string;
  garmentCount: number;
};

type Props = {
  open: boolean;
  data: TicketAckData | null;
  onAck: () => void;
};

export default function TicketAckModal({ open, data, onAck }: Props) {
  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-[2.5rem] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-green-600 px-8 py-6 text-center">
          <h3 className="text-3xl font-black text-white uppercase tracking-tight">Ticket Complete</h3>
        </div>
        <div className="px-8 py-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <span className="text-sm uppercase tracking-widest font-bold text-slate-400">Customer</span>
            <span className="text-xl font-black text-slate-800">{data.customerName}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <span className="text-sm uppercase tracking-widest font-bold text-slate-400">Ticket</span>
            <span className="text-xl font-black text-slate-800">{data.ticketNum}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm uppercase tracking-widest font-bold text-slate-400">Garments</span>
            <span className="text-xl font-black text-slate-800">{data.garmentCount}</span>
          </div>
        </div>
        <div className="px-8 pb-8">
          <button
            onClick={onAck}
            className="w-full py-5 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-2xl font-black uppercase tracking-tight active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
