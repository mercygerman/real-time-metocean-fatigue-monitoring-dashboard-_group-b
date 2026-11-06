import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { designHourlyBudget, type AlertThresholds } from "@/lib/fatigue/config";
import { fmtDateTime, fmtDay, fmtSci } from "@/lib/fatigue/format";
import { rollingDamage, type HourRecord } from "@/lib/fatigue/simulation";
import { chartTheme, Panel } from "./Panel";

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-raised/60 px-3 py-2">
      <div className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{label}</div>
      <div className="readout text-base">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

export function DamageRatePanel({
  history,
  thresholds,
}: {
  history: HourRecord[];
  thresholds: AlertThresholds;
}) {
  const budget = designHourlyBudget();
  const data = history.slice(-168).map((r) => ({ time: r.time, x: r.damage / budget, damage: r.damage }));
  const d24 = rollingDamage(history, 24);
  const d7 = rollingDamage(history, 168);
  const d30 = rollingDamage(history, 720);
  const peak = data.reduce((m, d) => Math.max(m, d.x), 0);

  return (
    <Panel
      title="Hourly damage rate"
      subtitle="Dirlik spectral damage per hour, normalised to the design hourly budget"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Last 24 h" value={fmtSci(d24)} sub={`${(d24 / (budget * 24)).toFixed(1)}× daily budget`} />
        <Stat label="Last 7 d" value={fmtSci(d7)} sub={`${(d7 / (budget * 168)).toFixed(1)}× budget`} />
        <Stat label="Last 30 d" value={fmtSci(d30)} sub={`${(d30 / (budget * 720)).toFixed(1)}× budget`} />
        <Stat label="7 d peak" value={`${peak.toFixed(1)}×`} sub={fmtSci(peak * budget)} />
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={0.5}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={fmtDay}
              tick={chartTheme.tick}
              stroke={chartTheme.grid}
              minTickGap={40}
            />
            <YAxis
              tick={chartTheme.tick}
              stroke={chartTheme.grid}
              width={40}
              allowDecimals={false}
              domain={[0, (max: number) => Math.ceil(Math.max(thresholds.hourlyCritX * 1.15, max * 1.1))]}
              tickFormatter={(v: number) => `${v}×`}
            />
            <Tooltip
              {...chartTheme.tooltip}
              labelFormatter={(t: number) => fmtDateTime(t)}
              formatter={(v: number, _n: string, item: { payload?: { damage: number } }) => [
                `${v.toFixed(2)}×  (${fmtSci(item.payload?.damage ?? 0)})`,
                "Damage",
              ]}
            />
            <ReferenceLine
              y={thresholds.hourlyWarnX}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              label={{ value: "warn", fill: "var(--warning)", fontSize: 10, position: "insideTopRight" }}
            />
            <ReferenceLine
              y={thresholds.hourlyCritX}
              stroke="var(--critical)"
              strokeDasharray="4 4"
              label={{ value: "critical", fill: "var(--critical)", fontSize: 10, position: "insideTopRight" }}
            />
            <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
            <Bar dataKey="x" isAnimationActive={false} radius={[1, 1, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.time}
                  fill={
                    d.x > thresholds.hourlyCritX
                      ? "var(--critical)"
                      : d.x > thresholds.hourlyWarnX
                        ? "var(--warning)"
                        : "var(--wave)"
                  }
                  fillOpacity={d.x > thresholds.hourlyWarnX ? 0.95 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
