import { useEffect, useMemo, useState } from "react";
import {
  getOperatorStatsInRangeTauri,
  getSessionsInRangeTauri,
  OperatorStat,
  SessionRow,
} from "../../lib/session_manager";

type TimeframeKey = "7d" | "30d" | "90d";

type PeriodStat = {
  label: string;
  garments: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TIMEFRAME_LABELS: Record<TimeframeKey, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

const GRID_COLS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  7: "grid-cols-7",
};

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateRange(timeframe: TimeframeKey): { startStr: string; endStr: string } {
  const end = new Date();
  const start = new Date(end);
  if (timeframe === "7d") start.setDate(start.getDate() - 6);
  else if (timeframe === "30d") start.setDate(start.getDate() - 29);
  else start.setDate(start.getDate() - 89);
  return { startStr: toLocalDateStr(start), endStr: toLocalDateStr(end) };
}

function sessionDateStr(loginAt: string): string {
  // login_at serialized as "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
  return loginAt.slice(0, 10);
}

function bucketSessions(sessions: SessionRow[], timeframe: TimeframeKey): PeriodStat[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (timeframe === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = toLocalDateStr(d);
      const garments = sessions
        .filter((s) => sessionDateStr(s.login_at) === dateStr)
        .reduce((sum, s) => sum + s.garments_scanned, 0);
      return { label: DAY_NAMES[d.getDay()], garments };
    });
  }

  if (timeframe === "30d") {
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - 29);
    return Array.from({ length: 4 }, (_, w) => {
      const weekStart = new Date(periodStart);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + (w < 3 ? 6 : 30));
      const startStr = toLocalDateStr(weekStart);
      const endStr = toLocalDateStr(weekEnd);
      const garments = sessions
        .filter((s) => {
          const d = sessionDateStr(s.login_at);
          return d >= startStr && d <= endStr;
        })
        .reduce((sum, s) => sum + s.garments_scanned, 0);
      return { label: `W${w + 1}`, garments };
    });
  }

  // 90d: last 3 calendar months
  return Array.from({ length: 3 }, (_, i) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - (2 - i), 1);
    const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const garments = sessions
      .filter((s) => s.login_at.slice(0, 7) === monthStr)
      .reduce((sum, s) => sum + s.garments_scanned, 0);
    return { label: MONTH_NAMES[monthDate.getMonth()], garments };
  });
}

function calcAvgPerHour(sessions: SessionRow[]): number {
  let totalGarments = 0;
  let totalHours = 0;
  for (const s of sessions) {
    if (s.logout_at && s.garments_scanned > 0) {
      const hours = (new Date(s.logout_at).getTime() - new Date(s.login_at).getTime()) / 3_600_000;
      if (hours > 0) {
        totalGarments += s.garments_scanned;
        totalHours += hours;
      }
    }
  }
  return totalHours > 0 ? Math.round(totalGarments / totalHours) : 0;
}

export default function OperatorData() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("7d");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { startStr, endStr } = getDateRange(timeframe);
    setLoading(true);
    Promise.all([
      getSessionsInRangeTauri(startStr, endStr).catch(() => [] as SessionRow[]),
      getOperatorStatsInRangeTauri(startStr, endStr).catch(() => [] as OperatorStat[]),
    ]).then(([s, os]) => {
      setSessions(s);
      setOperatorStats(os);
    }).finally(() => setLoading(false));
  }, [timeframe]);

  const periods = useMemo(() => bucketSessions(sessions, timeframe), [sessions, timeframe]);
  const totalGarments = useMemo(
    () => sessions.reduce((sum, s) => sum + s.garments_scanned, 0),
    [sessions]
  );
  const avgPerHour = useMemo(() => calcAvgPerHour(sessions), [sessions]);
  const operators = useMemo(() => new Set(sessions.map((s) => s.user_id)).size, [sessions]);
  const maxGarments = useMemo(() => Math.max(...periods.map((p) => p.garments), 1), [periods]);

  return (
    <div className="min-h-full w-full bg-surface p-6">
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
          <StatCard
            title="Avg Garments / Hour"
            value={avgPerHour.toString()}
            subtitle={TIMEFRAME_LABELS[timeframe]}
          />
          <StatCard
            title="Total Operators"
            value={operators.toString()}
            subtitle="Distinct operators"
          />
          <StatCard
            title="Total Garments Scanned"
            value={totalGarments.toLocaleString()}
            subtitle={TIMEFRAME_LABELS[timeframe]}
          />
        </div>

        <div className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">
                Throughput By Period
              </div>
              <h2 className="text-2xl font-black text-slate-900">Garments Scanned</h2>
            </div>
            {loading && <div className="text-xs text-slate-500 animate-pulse">Loading…</div>}
          </div>

          <div
            className={`grid ${GRID_COLS[periods.length] ?? "grid-cols-4"} gap-3 items-end min-h-[220px]`}
          >
            {periods.map((d) => (
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

        <div className="bg-white rounded-3xl shadow p-6">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">
              By Operator
            </div>
            <h2 className="text-2xl font-black text-slate-900">Operator Breakdown</h2>
          </div>

          {operatorStats.length === 0 && !loading ? (
            <div className="text-sm text-slate-400 py-8 text-center">No session data for this period.</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 text-[10px] uppercase tracking-widest text-slate-400 font-bold px-3 pb-1 border-b border-slate-100">
                <div className="col-span-4">Operator</div>
                <div className="col-span-2 text-right">Garments</div>
                <div className="col-span-2 text-right">Sessions</div>
                <div className="col-span-2 text-right">Avg / Hr</div>
                <div className="col-span-2 text-right">Share</div>
              </div>
              {operatorStats.map((op, i) => {
                const share = totalGarments > 0 ? (op.total_garments / totalGarments) * 100 : 0;
                return (
                  <div key={op.user_id} className="grid grid-cols-12 items-center px-3 py-2 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                        {i + 1}
                      </div>
                      <span className="font-bold text-slate-800 text-sm truncate">{op.username}</span>
                    </div>
                    <div className="col-span-2 text-right text-sm font-black text-slate-900">
                      {op.total_garments.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-right text-sm text-slate-600">
                      {op.total_sessions}
                    </div>
                    <div className="col-span-2 text-right text-sm text-slate-600">
                      {op.avg_per_hour > 0 ? Math.round(op.avg_per_hour) : "—"}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">
                        {share.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

function TimeframeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
