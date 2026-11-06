import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AlertThresholds } from "@/lib/fatigue/config";
import { fmtDateTime, fmtDay } from "@/lib/fatigue/format";
import type { HourRecord } from "@/lib/fatigue/simulation";
import { chartTheme, Panel } from "./Panel";

export function MetoceanTrendPanel({
  history,
  thresholds,
}: {
  history: HourRecord[];
  thresholds: AlertThresholds;
}) {
  const data = history.slice(-168);
  return (
    <Panel title="Metocean ingest" subtitle="Hourly readings · last 7 days">
      <div className="h-[19.5rem]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDay}
              tick={chartTheme.tick}
              stroke={chartTheme.grid}
              minTickGap={28}
            />
            <YAxis yAxisId="hs" tick={chartTheme.tick} stroke={chartTheme.grid} width={36} domain={[0, "auto"]} />
            <YAxis
              yAxisId="tp"
              orientation="right"
              tick={chartTheme.tick}
              stroke={chartTheme.grid}
              width={36}
              domain={[0, "auto"]}
            />
            <Tooltip
              {...chartTheme.tooltip}
              labelFormatter={(t: number) => fmtDateTime(t)}
              formatter={(v: number, name: string) => {
                if (name === "hs") return [`${v.toFixed(2)} m`, "Hs"];
                if (name === "tp") return [`${v.toFixed(1)} s`, "Tp"];
                return [`${v.toFixed(1)} m/s`, "Wind"];
              }}
            />
            <ReferenceLine
              yAxisId="hs"
              y={thresholds.hsWarn}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              label={{ value: `Hs ${thresholds.hsWarn} m`, fill: "var(--warning)", fontSize: 10, position: "insideTopLeft" }}
            />
            <Line yAxisId="tp" dataKey="tp" stroke="var(--muted-foreground)" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="tp" dataKey="windSpeed" stroke="var(--ok)" strokeOpacity={0.6} strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="hs" dataKey="hs" stroke="var(--wave)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-wave" /> Hs [m]
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-muted-foreground" /> Tp [s]
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-ok" /> Wind [m/s]
        </span>
      </div>
    </Panel>
  );
}
