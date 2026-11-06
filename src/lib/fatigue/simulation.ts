import {
  allowableDamage,
  HOURS_PER_YEAR,
  LIFE,
  SN_CURVE,
  STRUCTURE,
  type LifeConfig,
  type SNCurve,
  type StructureConfig,
} from "./config";
import { dirlikDamage } from "./damage";
import type { MetoceanReading } from "./metocean";
import {
  jonswapGamma,
  jonswapSpectrum,
  spectralMoments,
  stressSpectrum,
} from "./spectrum";

export interface HourRecord extends MetoceanReading {
  /** Sequential hour index since monitoring start */
  index: number;
  gamma: number;
  /** Hourly Miner damage */
  damage: number;
  /** Cumulative Miner damage incl. pre-monitoring damage */
  cumDamage: number;
  sigmaRms: number;
  cycles: number;
  irregularity: number;
}

export interface SeaStateSpectra {
  wave: number[];
  stress: number[];
}

/** Compute spectra and one hour of spectral fatigue damage for a reading */
export function analyseReading(
  reading: MetoceanReading,
  structure: StructureConfig = STRUCTURE,
  sn: SNCurve = SN_CURVE,
) {
  const gamma = jonswapGamma(reading.hs, reading.tp);
  const wave = jonswapSpectrum(reading.hs, reading.tp, gamma);
  const stress = stressSpectrum(wave, reading.waveDir, structure);
  const result = dirlikDamage(spectralMoments(stress), sn, 3600);
  return { gamma, wave, stress, result };
}

export function buildRecord(
  reading: MetoceanReading,
  index: number,
  prevCum: number,
): HourRecord {
  const { gamma, result } = analyseReading(reading);
  return {
    ...reading,
    index,
    gamma,
    damage: result.damage,
    cumDamage: prevCum + result.damage,
    sigmaRms: result.sigmaRms,
    cycles: result.cycles,
    irregularity: result.irregularity,
  };
}

/** Sum of damage over the last `hours` records */
export function rollingDamage(history: HourRecord[], hours: number): number {
  let s = 0;
  for (let i = Math.max(0, history.length - hours); i < history.length; i++) s += history[i].damage;
  return s;
}

export interface LifeProjection {
  /** Annualised damage rate from the rolling window */
  annualRate: number;
  /** Hours actually used in the window */
  windowHours: number;
  /** Years until cumulative damage reaches the allowable Miner sum */
  remainingLifeYears: number;
  /** Remaining design life [years] */
  remainingDesignYears: number;
  utilisation: number;
}

export function projectLife(
  history: HourRecord[],
  windowHours = 720,
  life: LifeConfig = LIFE,
): LifeProjection {
  const allow = allowableDamage(life);
  const last = history[history.length - 1];
  const cum = last ? last.cumDamage : life.initialDamage;
  const n = Math.min(windowHours, history.length);
  const annualRate = n > 0 ? (rollingDamage(history, n) / n) * HOURS_PER_YEAR : 0;
  const elapsedYears = history.length / HOURS_PER_YEAR;
  const remainingDesignYears = Math.max(
    0,
    life.designLifeYears - life.serviceAgeYears - elapsedYears,
  );
  const remainingLifeYears =
    annualRate > 0 ? Math.max(0, (allow - cum) / annualRate) : Number.POSITIVE_INFINITY;
  return { annualRate, windowHours: n, remainingLifeYears, remainingDesignYears, utilisation: cum / allow };
}
