import { designHourlyBudget, type AlertThresholds, LIFE } from "./config";
import { projectLife, rollingDamage, type HourRecord } from "./simulation";

export type Severity = "warning" | "critical";
export type AlertRule = "hourly_damage" | "daily_damage" | "sea_state" | "remaining_life";

export interface Alert {
  id: string;
  rule: AlertRule;
  severity: Severity;
  status: "active" | "resolved";
  acknowledged: boolean;
  startTime: number;
  endTime?: number;
  /** Value at trigger time */
  triggerValue: number;
  /** Worst value during the episode */
  peakValue: number;
  threshold: number;
  message: string;
}

export const RULE_LABELS: Record<AlertRule, string> = {
  hourly_damage: "Hourly damage rate",
  daily_damage: "24 h damage budget",
  sea_state: "Sea state limit",
  remaining_life: "Remaining life projection",
};

/** Hysteresis: an active alert clears only once the value is back past this fraction of the warn limit */
export const CLEAR_FACTOR = 0.85;

interface RuleEval {
  rule: AlertRule;
  value: number;
  level: Severity | null;
  /** Whether the episode may clear (with hysteresis) */
  clear: boolean;
  threshold: number;
  /** true when larger values are worse */
  higherIsWorse: boolean;
  describe: (sev: Severity, v: number) => string;
}

const sci = (v: number) => v.toExponential(2);

export function evaluateRules(history: HourRecord[], t: AlertThresholds): RuleEval[] {
  const rec = history[history.length - 1];
  const hb = designHourlyBudget();
  const above = (v: number, warn: number, crit: number): Severity | null =>
    v > crit ? "critical" : v > warn ? "warning" : null;

  const hourlyWarn = t.hourlyWarnX * hb;
  const hourlyCrit = t.hourlyCritX * hb;
  const daily = rollingDamage(history, 24);
  const dailyWarn = t.dailyWarnX * hb * 24;
  const dailyCrit = t.dailyCritX * hb * 24;
  const life = projectLife(history, 720, LIFE);
  const lifeRatio = life.remainingDesignYears > 0 ? life.remainingLifeYears / life.remainingDesignYears : 1;

  return [
    {
      rule: "hourly_damage",
      value: rec.damage,
      level: above(rec.damage, hourlyWarn, hourlyCrit),
      clear: rec.damage < hourlyWarn * CLEAR_FACTOR,
      threshold: hourlyWarn,
      higherIsWorse: true,
      describe: (s, v) =>
        `Hourly damage ${sci(v)} exceeds ${s === "critical" ? t.hourlyCritX : t.hourlyWarnX}× design budget (Hs ${rec.hs.toFixed(1)} m, Tp ${rec.tp.toFixed(1)} s)`,
    },
    {
      rule: "daily_damage",
      value: daily,
      level: above(daily, dailyWarn, dailyCrit),
      clear: daily < dailyWarn * CLEAR_FACTOR,
      threshold: dailyWarn,
      higherIsWorse: true,
      describe: (s, v) =>
        `Rolling 24 h damage ${sci(v)} above ${s === "critical" ? t.dailyCritX : t.dailyWarnX}× daily allowance`,
    },
    {
      rule: "sea_state",
      value: rec.hs,
      level: above(rec.hs, t.hsWarn, t.hsCrit),
      clear: rec.hs < t.hsWarn * CLEAR_FACTOR + (1 - CLEAR_FACTOR) * 0, // hysteresis on Hs
      threshold: t.hsWarn,
      higherIsWorse: true,
      describe: (s, v) =>
        `Significant wave height ${v.toFixed(2)} m above ${s === "critical" ? t.hsCrit : t.hsWarn} m limit`,
    },
    {
      rule: "remaining_life",
      value: lifeRatio,
      level: lifeRatio < t.lifeCritRatio ? "critical" : lifeRatio < t.lifeWarnRatio ? "warning" : null,
      clear: lifeRatio > t.lifeWarnRatio * 1.02,
      threshold: t.lifeWarnRatio,
      higherIsWorse: false,
      describe: () =>
        `Projected life ${life.remainingLifeYears.toFixed(1)} y is below remaining design life ${life.remainingDesignYears.toFixed(1)} y (30-day rate)`,
    },
  ];
}

const worse = (a: number, b: number, higherIsWorse: boolean) =>
  higherIsWorse ? Math.max(a, b) : Math.min(a, b);

/**
 * Advance alert state by one hour. Each rule holds at most one active episode;
 * an episode escalates to critical, and resolves (with hysteresis) when clear.
 * Returns a new array, newest first.
 */
export function updateAlerts(
  alerts: Alert[],
  history: HourRecord[],
  thresholds: AlertThresholds,
): { alerts: Alert[]; raised: Alert[] } {
  const rec = history[history.length - 1];
  if (!rec) return { alerts, raised: [] };
  const next = alerts.slice();
  const raised: Alert[] = [];

  for (const ev of evaluateRules(history, thresholds)) {
    const idx = next.findIndex((a) => a.rule === ev.rule && a.status === "active");
    const active = idx >= 0 ? next[idx] : undefined;

    if (active) {
      const peak = worse(active.peakValue, ev.value, ev.higherIsWorse);
      if (ev.level === "critical" && active.severity === "warning") {
        const escalated: Alert = {
          ...active,
          severity: "critical",
          acknowledged: false,
          peakValue: peak,
          message: ev.describe("critical", ev.value),
        };
        next[idx] = escalated;
        raised.push(escalated);
      } else if (!ev.level && ev.clear) {
        next[idx] = { ...active, status: "resolved", endTime: rec.time, peakValue: peak };
      } else {
        next[idx] = { ...active, peakValue: peak };
      }
    } else if (ev.level) {
      const alert: Alert = {
        id: `${ev.rule}-${rec.index}`,
        rule: ev.rule,
        severity: ev.level,
        status: "active",
        acknowledged: false,
        startTime: rec.time,
        triggerValue: ev.value,
        peakValue: ev.value,
        threshold: ev.threshold,
        message: ev.describe(ev.level, ev.value),
      };
      next.unshift(alert);
      raised.push(alert);
    }
  }
  return { alerts: next, raised };
}
