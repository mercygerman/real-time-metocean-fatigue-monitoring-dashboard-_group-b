/**
 * Structural, S-N and alert configuration for the simulated fatigue monitor.
 * All damage values are Palmgren-Miner damage (dimensionless).
 */

export interface StructureConfig {
  name: string;
  hotspot: string;
  /** Quasi-static stress per metre of wave elevation at the hotspot, incl. SCF [MPa/m] */
  stressGain: number;
  /** First global natural frequency [Hz] */
  naturalFreq: number;
  /** Critical damping ratio [-] */
  damping: number;
  /** Effective depth for hydrodynamic load attenuation [m] */
  attenuationDepth: number;
  /** Most sensitive incoming wave direction [deg, coming from] */
  criticalDirection: number;
}

export interface SNCurve {
  label: string;
  /** Inverse slope */
  m: number;
  /** log10 of intercept a (N = a * S^-m, S in MPa) */
  logA: number;
}

export interface LifeConfig {
  designLifeYears: number;
  serviceAgeYears: number;
  designFatigueFactor: number;
  /** Damage accumulated before monitoring started */
  initialDamage: number;
}

export interface AlertThresholds {
  /** Hourly damage, as multiples of the design hourly damage budget */
  hourlyWarnX: number;
  hourlyCritX: number;
  /** Rolling 24 h damage, as multiples of the design daily budget */
  dailyWarnX: number;
  dailyCritX: number;
  /** Significant wave height limits [m] */
  hsWarn: number;
  hsCrit: number;
  /** Projected life as fraction of remaining design life */
  lifeWarnRatio: number;
  lifeCritRatio: number;
}

export const STRUCTURE: StructureConfig = {
  name: "Jacket JKT-07",
  hotspot: "Mercy, Hassanat, Gideon - Group B",
  stressGain: 7.24,
  naturalFreq: 0.33,
  damping: 0.02,
  attenuationDepth: 6,
  criticalDirection: 225,
};

/** DNV-RP-C203 D-curve, seawater free corrosion (single slope) */
export const SN_CURVE: SNCurve = {
  label: "DNV D-curve · seawater, free corrosion",
  m: 3,
  logA: 11.687,
};

export const LIFE: LifeConfig = {
  designLifeYears: 25,
  serviceAgeYears: 14,
  designFatigueFactor: 2,
  initialDamage: 0.262,
};

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  hourlyWarnX: 6,
  hourlyCritX: 15,
  dailyWarnX: 4,
  dailyCritX: 10,
  hsWarn: 6,
  hsCrit: 8,
  lifeWarnRatio: 1,
  lifeCritRatio: 0.75,
};

export const HOURS_PER_YEAR = 8760;

/** Allowable Miner sum = 1 / DFF */
export function allowableDamage(life: LifeConfig = LIFE): number {
  return 1 / life.designFatigueFactor;
}

/** Design damage budget per hour (allowable spread evenly over design life) */
export function designHourlyBudget(life: LifeConfig = LIFE): number {
  return allowableDamage(life) / (life.designLifeYears * HOURS_PER_YEAR);
}
