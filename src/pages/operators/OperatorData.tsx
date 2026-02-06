import { useMemo, useState } from "react";

type TimeframeKey = "7d" | "30d" | "90d";

type DayStat = {
  label: string;
  garments: number;
};

const TIMEFRAMES: Record<TimeframeKey, { label: string; days: DayStat[]; avgPerHour: number; operators: number }> = {
  "7d": {
    label: "Last 7 Days",
    avgPerHour: 142,
    operators: 12,
    days: [
      { label: "Mon", garments: 860 },
      { label: "Tue", garments: 920 },
      { label: "Wed", garments: 780 },
      { label: "Thu", garments: 1010 },
      { label: "Fri", garments: 1140 },
      { label: "Sat", garments: 690 },
      { label: "Sun", garments: 530 },
    ],
  },
  "30d": {
    label: "Last 30 Days",
    avgPerHour: 136,
    operators: 27,
    days: [
      { label: "W1", garments: 5200 },
      { label: "W2", garments: 5710 },
      { label: "W3", garments: 4980 },
      { label: "W4", garments: 6120 },
    ],
  },
  "90d": {
    label: "Last 90 Days",
    avgPerHour: 128,
    operators: 41,
    days: [
      { label: "Jan", garments: 19840 },
      { label: "Feb", garments: 21410 },
      { label: "Mar", garments: 20620 },
    ],
  },
};

export default function OperatorData() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("7d");
  const data = TIMEFRAMES[timeframe];

  const maxGarments = useMemo(
    () => Math.max(...data.days.map((d) => d.garments)),
    [data.days]
  );

  const totalGarments = useMemo(
    () => data.days.reduce((acc, d) => acc + d.garments, 0),
    [data.days]
  );

  return (
    <div className="min-h-full w-full bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">
              Operator Analytics
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Performance Overview
            </h1>
          </div>

          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow">
            <TimeframeButton
              label="7 Days"
              active={timeframe === "7d"}
              onClick={() => setTimeframe("7d")}
            />
            <TimeframeButton
              label="30 Days"
              active={timeframe === "30d"}
              onClick={() => setTimeframe("30d")}
            />
            <TimeframeButton
              label="90 Days"
              active={timeframe === "90d"}
              onClick={() => setTimeframe("90d")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Avg Garments / Hour" value={data.avgPerHour.toString()} subtitle={data.label} />
          <StatCard title="Total Operators Used" value={data.operators.toString()} subtitle="Distinct operators" />
          <StatCard title="Total Garments Scanned" value={totalGarments.toLocaleString()} subtitle="Mock data" />
        </div>

        <div className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">
                Throughput By Period
              </div>
              <h2 className="text-2xl font-black text-slate-900">Garments Scanned</h2>
            </div>
            <div className="text-xs text-slate-500">Mock data for layout</div>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end min-h-[220px]">
            {data.days.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-2">
                <div className="w-full flex items-end">
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-blue-600 to-blue-400 shadow"
                    style={{ height: `${Math.max(18, (d.garments / maxGarments) * 180)}px` }}
                  />
                </div>
                <div className="text-xs font-bold text-slate-600">{d.label}</div>
                <div className="text-[10px] text-slate-500">{d.garments.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-3xl shadow p-6">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">{title}</div>
      <div className="mt-3 text-4xl font-black text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-2">{subtitle}</div>
    </div>
  );
}

function TimeframeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        active ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
