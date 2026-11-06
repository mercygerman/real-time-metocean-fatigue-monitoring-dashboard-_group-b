import { describe, expect, it } from "vitest";

import { updateAlerts, type Alert } from "@/lib/fatigue/alerts";
import {
  allowableDamage,
  DEFAULT_THRESHOLDS,
  designHourlyBudget,
  LIFE,
  SN_CURVE,
} from "@/lib/fatigue/config";
import { dirlikDamage, narrowBandDamage } from "@/lib/fatigue/damage";
import { projectLife, type HourRecord } from "@/lib/fatigue/simulation";
import { FREQS, jonswapGamma, jonswapSpectrum, spectralMoments } from "@/lib/fatigue/spectrum";

function rec(index: number, damage: number, hs = 2, cum = LIFE.initialDamage): HourRecord {
  return {
    index,
    time: Date.UTC(2026, 10, 1) + index * 3_600_000,
    hs,
    tp: 8,
    waveDir: 240,
    windSpeed: 8,
    windDir: 240,
    current: 0.4,
    storm: false,
    gamma: 1,
    damage,
    cumDamage: cum,
    sigmaRms: 1,
    cycles: 1000,
    irregularity: 0.9,
  };
}

describe("wave spectrum", () => {
  it("JONSWAP spectrum has m0 = Hs²/16", () => {
    const s = jonswapSpectrum(4, 10, 3.3);
    expect(spectralMoments(s).m0).toBeCloseTo(1, 6);
  });

  it("peak enhancement follows DNV limits", () => {
    expect(jonswapGamma(4, 7)).toBe(5); // Tp/√Hs = 3.5
    expect(jonswapGamma(1, 6)).toBe(1); // Tp/√Hs = 6
  });
});

describe("spectral fatigue damage", () => {
  it("Dirlik matches narrow-band damage for a narrow-band stress spectrum", () => {
    const s = FREQS.map((f) => Math.exp(-(((f - 0.2) / 0.004) ** 2)));
    const mom = spectralMoments(s);
    const dl = dirlikDamage(mom, SN_CURVE, 3600).damage;
    const nb = narrowBandDamage(mom, SN_CURVE, 3600);
    expect(dl / nb).toBeGreaterThan(0.9);
    expect(dl / nb).toBeLessThanOrEqual(1.01);
  });

  it("doubling stress amplitude multiplies damage by 2^m = 8", () => {
    const s = jonswapSpectrum(3, 9, 2);
    const d1 = dirlikDamage(spectralMoments(s), SN_CURVE, 3600).damage;
    const d2 = dirlikDamage(spectralMoments(s.map((v) => v * 4)), SN_CURVE, 3600).damage;
    expect(d2 / d1).toBeCloseTo(8, 6);
  });
});

describe("life limits", () => {
  it("allowable damage is 1/DFF = 0.5", () => {
    expect(allowableDamage()).toBe(0.5);
  });

  it("design hourly budget spreads allowable damage over the 25-year design life", () => {
    expect(designHourlyBudget()).toBeCloseTo(0.5 / (25 * 8760), 15);
  });

  it("remaining life = (allowable - cumulative) / annual rate", () => {
    const hourly = 2e-6;
    const history = Array.from({ length: 720 }, (_, i) => rec(i, hourly, 2, 0.3));
    const p = projectLife(history);
    expect(p.annualRate).toBeCloseTo(hourly * 8760, 10);
    expect(p.remainingLifeYears).toBeCloseTo(0.2 / (hourly * 8760), 6);
  });
});

describe("alerts", () => {
  const b = designHourlyBudget();
  const step = (alerts: Alert[], history: HourRecord[]) =>
    updateAlerts(alerts, history, DEFAULT_THRESHOLDS).alerts;
  const hourly = (a: Alert[]) => a.find((x) => x.rule === "hourly_damage");

  it("raises a warning when hourly damage exceeds 6× budget and escalates above 15×", () => {
    const h: HourRecord[] = [rec(0, 7 * b)];
    let a = step([], h);
    expect(hourly(a)?.severity).toBe("warning");
    h.push(rec(1, 16 * b));
    a = step(a, h);
    expect(hourly(a)?.severity).toBe("critical");
    expect(a.filter((x) => x.rule === "hourly_damage")).toHaveLength(1);
  });

  it("stays below warning at 5× budget", () => {
    expect(hourly(step([], [rec(0, 5 * b)]))).toBeUndefined();
  });

  it("resolves only once hourly damage drops below 85% of the warning limit", () => {
    const h: HourRecord[] = [rec(0, 7 * b)];
    let a = step([], h);
    h.push(rec(1, 5.5 * b));
    a = step(a, h);
    expect(hourly(a)?.status).toBe("active");
    h.push(rec(2, 5 * b));
    a = step(a, h);
    expect(hourly(a)?.status).toBe("resolved");
  });

  it("raises a sea state warning above Hs 6 m and critical above 8 m", () => {
    const sea = (hs: number) => step([], [rec(0, 0, hs)]).find((x) => x.rule === "sea_state");
    expect(sea(5.9)).toBeUndefined();
    expect(sea(6.5)?.severity).toBe("warning");
    expect(sea(8.5)?.severity).toBe("critical");
  });
});
