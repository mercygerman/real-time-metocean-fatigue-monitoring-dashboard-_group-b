import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STRUCTURE } from "@/lib/fatigue/config";
import { compass } from "@/lib/fatigue/format";
import { FREQS } from "@/lib/fatigue/spectrum";
import { analyseReading, type HourRecord } from "@/lib/fatigue/simulation";
import { chartTheme, Panel } from "./Panel";

function Compass({ wave, wind }: { wave: number; wind: number }) {
  const arrow = (deg: number, cls: string, len: number) => (
    <g transform={`rotate(${deg} 50 50)`}>
      <line x1="50" y1={50 - len} x2="50" y2="50" className={cls} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy={50 - len} r="3" className={cls} />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" className="size-24 shrink-0" aria-label={`Waves from ${wave.toFixed(0)} degrees`}>
      <circle cx="50" cy="50" r="44" className="fill-panel-raised stroke-grid" strokeWidth="1" />
      <circle cx="50" cy="50" r="30" className="fill-none stroke-grid" strokeDasharray="2 3" strokeWidth="0.6" />
      {Array.from({ length: 36 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="6"
          x2="50"
          y2={i % 9 === 0 ? 12 : 9}
          transform={`rotate(${i * 10} 50 50)`}
          className="stroke-muted-foreground"
          strokeWidth={i % 9 === 0 ? 1.2 : 0.5}
        />
      ))}
      {["N", "E", "S", "W"].map((c, i) => (
        <text
          key={c}
          x={50 + 33 * Math.sin((i * Math.PI) / 2)}
          y={53 - 33 * Math.cos((i * Math.PI) / 2)}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          {c}
        </text>
      ))}
      {arrow(wind, "stroke-muted-foreground fill-muted-foreground", 26)}
      {arrow(wave, "stroke-primary fill-primary", 38)}
      <circle cx="50" cy="50" r="2.5" className="fill-foreground" />
    </svg>
  );
}

function Readout({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-l border-border pl-3">
      <div className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{label}</div>
      <div className="readout text-lg">
        {value}
        {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function SeaStatePanel({ rec }: { rec: HourRecord }) {
  const data = useMemo(() => {
    const { wave, stress } = analyseReading(rec);
    return FREQS.map((f, i) => ({ f, wave: wave[i], stress: stress[i] }));
  }, [rec]);

  return (
    <Panel
      title="Current sea state"
      subtitle="JONSWAP wave spectrum and hotspot stress response"
      actions={
        rec.storm ? (
          <span className="rounded border border-critical/50 bg-critical/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-critical uppercase">
            Storm
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Compass wave={rec.waveDir} wind={rec.windDir} />
          <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4">
            <Readout label="Hs" value={rec.hs.toFixed(2)} unit="m" />
            <Readout label="Tp" value={rec.tp.toFixed(1)} unit="s" />
            <Readout label="Wave dir" value={`${rec.waveDir.toFixed(0)}°`} unit={compass(rec.waveDir)} />
            <Readout label="Wind" value={rec.windSpeed.toFixed(1)} unit="m/s" />
            <Readout label="Current" value={rec.current.toFixed(2)} unit="m/s" />
            <Readout label="σ rms" value={rec.sigmaRms.toFixed(2)} unit="MPa" />
            <Readout label="Cycles/h" value={rec.cycles.toFixed(0)} />
            <Readout label="α₂" value={rec.irregularity.toFixed(3)} />
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--wave)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--wave)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="f"
                type="number"
                domain={[0, 0.6]}
                ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]}
                tick={chartTheme.tick}
                stroke={chartTheme.grid}
                label={{ value: "Frequency [Hz]", position: "insideBottomRight", offset: -2, fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="w"
                tick={chartTheme.tick}
                stroke={chartTheme.grid}
                width={44}
                tickFormatter={(v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1))}
              />
              <YAxis
                yAxisId="s"
                orientation="right"
                tick={chartTheme.tick}
                stroke={chartTheme.grid}
                width={44}
                tickFormatter={(v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1))}
              />
              <Tooltip
                {...chartTheme.tooltip}
                labelFormatter={(f: number) => `f = ${f.toFixed(3)} Hz  (T = ${(1 / f).toFixed(1)} s)`}
                formatter={(v: number, name: string) =>
                  name === "wave" ? [`${v.toFixed(3)} m²/Hz`, "Sη wave"] : [`${v.toFixed(2)} MPa²/Hz`, "Sσ stress"]
                }
              />
              <ReferenceLine
                yAxisId="w"
                x={+(1 / rec.tp).toFixed(4)}
                stroke="var(--wave)"
                strokeDasharray="3 3"
                label={{ value: "fp", fill: "var(--wave)", fontSize: 10, position: "top" }}
              />
              <ReferenceLine
                yAxisId="w"
                x={STRUCTURE.naturalFreq}
                stroke="var(--stress)"
                strokeDasharray="3 3"
                label={{ value: "fn", fill: "var(--stress)", fontSize: 10, position: "top" }}
              />
              <Area
                yAxisId="w"
                dataKey="wave"
                type="monotone"
                stroke="var(--wave)"
                strokeWidth={1.5}
                fill="url(#waveFill)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="s"
                dataKey="stress"
                type="monotone"
                stroke="var(--stress)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-wave" /> Wave Sη(f) [m²/Hz]
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-stress" /> Stress Sσ(f) [MPa²/Hz]
          </span>
        </div>
      </div>
    </Panel>
  );
}
