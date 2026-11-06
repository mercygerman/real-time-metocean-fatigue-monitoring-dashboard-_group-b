import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BACKFILL_HOURS } from "@/hooks/use-fatigue-simulation";
import { allowableDamage, LIFE } from "@/lib/fatigue/config";
import { fmtDateTime, fmtDay, fmtYears } from "@/lib/fatigue/format";
import type { HourRecord, LifeProjection } from "@/lib/fatigue/simulation";
import { chartTheme, Panel } from "./Panel";

export function TrajectoryPanel({
  history,
  life,
}: {
  history: HourRecord[];
  life: LifeProjection;
}) {
  const allow = allowableDamage();
  const last = history[history.length - 1];
  const designRate = allow / LIFE.designLifeYears;
  const liveStart = history.find((r) => r.index === BACKFILL_HOURS);

  const window = useMemo(
    () => history.filter((_, i) => i % 3 === 0 || i === history.length - 1).map((r) => ({ time: r.time, cum: r.cumDamage })),
    [history],
  );

  const projection = useMemo(() => {
    const exhaustMonitored = Number.isFinite(life.remainingLifeYears) ? life.remainingLifeYears : 50;
    const exhaustDesign = (allow - last.cumDamage) / designRate;
    const horizon = Math.min(40, Math.ceil(Math.max(exhaustMonitored, exhaustDesign, life.remainingDesignYears) * 1.15));
    const n = 80;
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = (horizon * i) / n;
      return {
        t,
        monitored: Math.min(allow * 1.08, last.cumDamage + life.annualRate * t),
        design: Math.min(allow * 1.08, last.cumDamage + designRate * t),
      };
    });
  }, [life, last.cumDamage, allow, designRate]);

  const exhaust = life.remainingLifeYears;

  return (
    <Panel
      title="Cumulative damage trajectory"
      subtitle="Palmgren–Miner sum with remaining life projection"
      actions={
        <div className="text-right">
          <div className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">Projected exhaustion</div>
          <div className="readout text-lg text-trajectory">{fmtYears(exhaust)} y</div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Monitoring window · {Math.round(history.length / 24)} d</span>
            <span className="readout text-xs">
              ΔD {(last.cumDamage - history[0].cumDamage + history[0].damage).toExponential(2)}
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={window} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--trajectory)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--trajectory)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={fmtDay}
                  tick={chartTheme.tick}
                  stroke={chartTheme.grid}
                  minTickGap={32}
                />
                <YAxis
                  domain={["dataMin", "dataMax"]}
                  tick={chartTheme.tick}
                  stroke={chartTheme.grid}
                  width={52}
                  tickFormatter={(v: number) => v.toFixed(4)}
                />
                <Tooltip
                  {...chartTheme.tooltip}
                  labelFormatter={(t: number) => fmtDateTime(t)}
                  formatter={(v: number) => [v.toFixed(6), "Cumulative D"]}
                />
                {liveStart && (
                  <ReferenceLine
                    x={liveStart.time}
                    stroke="var(--primary)"
                    strokeDasharray="3 3"
                    label={{ value: "live", fill: "var(--primary)", fontSize: 10, position: "insideTopLeft" }}
                  />
                )}
                <Area
                  dataKey="cum"
                  type="stepAfter"
                  stroke="var(--trajectory)"
                  strokeWidth={1.75}
                  fill="url(#cumFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Life projection · years from now</span>
            <span className="readout text-xs">
              rate {life.annualRate.toFixed(4)}/y vs design {designRate.toFixed(4)}/y
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projection} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, "dataMax"]}
                  tick={chartTheme.tick}
                  stroke={chartTheme.grid}
                  tickFormatter={(v: number) => `${Math.round(v)}y`}
                />
                <YAxis
                  domain={[Math.floor(last.cumDamage * 20) / 20, allow * 1.1]}
                  tick={chartTheme.tick}
                  stroke={chartTheme.grid}
                  width={40}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <Tooltip
                  {...chartTheme.tooltip}
                  labelFormatter={(t: number) => `+${t.toFixed(1)} years`}
                  formatter={(v: number, name: string) => [
                    v.toFixed(4),
                    name === "monitored" ? "Monitored (30 d rate)" : "Design basis",
                  ]}
                />
                <ReferenceLine
                  y={allow}
                  stroke="var(--critical)"
                  strokeDasharray="5 3"
                  label={{ value: `Allowable D = 1/DFF = ${allow}`, fill: "var(--critical)", fontSize: 10, position: "insideBottomLeft" }}
                />
                <ReferenceLine
                  x={life.remainingDesignYears}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="3 3"
                  label={{ value: "end of design life", fill: "var(--muted-foreground)", fontSize: 10, position: "insideTopRight", angle: 0 }}
                />
                <Line dataKey="design" stroke="var(--muted-foreground)" strokeDasharray="6 4" strokeWidth={1.25} dot={false} isAnimationActive={false} />
                <Line dataKey="monitored" stroke="var(--trajectory)" strokeWidth={2} dot={false} isAnimationActive={false} />
                {Number.isFinite(exhaust) && exhaust <= projection[projection.length - 1].t && (
                  <ReferenceDot x={exhaust} y={allow} r={4} fill="var(--trajectory)" stroke="var(--background)" strokeWidth={2} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Panel>
  );
}
