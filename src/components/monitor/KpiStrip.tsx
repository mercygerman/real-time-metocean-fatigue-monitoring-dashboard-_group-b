import type { ReactNode } from "react";

import type { Alert } from "@/lib/fatigue/alerts";
import { designHourlyBudget, type AlertThresholds } from "@/lib/fatigue/config";
import { fmtYears, sciParts } from "@/lib/fatigue/format";
import type { HourRecord, LifeProjection } from "@/lib/fatigue/simulation";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warning" | "critical" | "neutral";

const toneText: Record<Tone, string> = {
  ok: "text-ok",
  warning: "text-warning",
  critical: "text-critical",
  neutral: "text-foreground",
};
const toneGlow: Record<Tone, string> = {
  ok: "",
  warning: "glow-warning",
  critical: "animate-alarm",
  neutral: "",
};

function Kpi({
  label,
  tone = "neutral",
  children,
  foot,
}: {
  label: string;
  tone?: Tone;
  children: ReactNode;
  foot: ReactNode;
}) {
  return (
    <div className={cn("panel scanline flex flex-col justify-between gap-2 px-4 py-3", toneGlow[tone])}>
      <div className="flex items-center justify-between">
        <span className="panel-title">{label}</span>
        {tone !== "neutral" && (
          <span className={cn("size-1.5 rounded-full", `bg-${tone}`, tone !== "ok" && "animate-live-pulse")} />
        )}
      </div>
      <div className={cn("readout text-2xl font-medium md:text-3xl", toneText[tone])}>{children}</div>
      <div className="text-xs text-muted-foreground">{foot}</div>
    </div>
  );
}

export function Sci({ v, digits = 2 }: { v: number; digits?: number }) {
  const { mantissa, exponent } = sciParts(v, digits);
  return (
    <span>
      {mantissa}
      <span className="text-[0.6em] text-muted-foreground">×10</span>
      <sup className="text-[0.5em]">{exponent}</sup>
    </span>
  );
}

export function KpiStrip({
  rec,
  life,
  alerts,
  thresholds,
}: {
  rec: HourRecord;
  life: LifeProjection;
  alerts: Alert[];
  thresholds: AlertThresholds;
}) {
  const budget = designHourlyBudget();
  const ratio = rec.damage / budget;
  const dmgTone: Tone =
    ratio > thresholds.hourlyCritX ? "critical" : ratio > thresholds.hourlyWarnX ? "warning" : "ok";
  const hsTone: Tone = rec.hs > thresholds.hsCrit ? "critical" : rec.hs > thresholds.hsWarn ? "warning" : "ok";
  const lifeRatio = life.remainingLifeYears / life.remainingDesignYears;
  const lifeTone: Tone =
    lifeRatio < thresholds.lifeCritRatio ? "critical" : lifeRatio < thresholds.lifeWarnRatio ? "warning" : "ok";
  const active = alerts.filter((a) => a.status === "active");
  const unack = active.filter((a) => !a.acknowledged).length;
  const alertTone: Tone = active.some((a) => a.severity === "critical")
    ? "critical"
    : active.length
      ? "warning"
      : "ok";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi label="Sea state" tone={hsTone} foot={<>Tp {rec.tp.toFixed(1)} s · γ {rec.gamma.toFixed(2)}{rec.storm ? " · storm" : ""}</>}>
        {rec.hs.toFixed(2)}
        <span className="ml-1 text-sm text-muted-foreground">m Hs</span>
      </Kpi>
      <Kpi label="Hourly damage" tone={dmgTone} foot={<>{ratio.toFixed(1)}× design budget</>}>
        <Sci v={rec.damage} />
      </Kpi>
      <Kpi
        label="Cumulative damage"
        foot={
          <div className="space-y-1">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-trajectory" style={{ width: `${Math.min(100, life.utilisation * 100)}%` }} />
            </div>
            <span>{(life.utilisation * 100).toFixed(2)}% of allowable</span>
          </div>
        }
      >
        {rec.cumDamage.toFixed(5)}
      </Kpi>
      <Kpi label="Remaining life" tone={lifeTone} foot={<>Design remaining {life.remainingDesignYears.toFixed(1)} y · 30 d rate</>}>
        {fmtYears(life.remainingLifeYears)}
        <span className="ml-1 text-sm text-muted-foreground">yrs</span>
      </Kpi>
      <Kpi
        label="Active alerts"
        tone={alertTone}
        foot={unack ? `${unack} unacknowledged` : active.length ? "All acknowledged" : "System nominal"}
      >
        {active.length}
      </Kpi>
    </div>
  );
}
