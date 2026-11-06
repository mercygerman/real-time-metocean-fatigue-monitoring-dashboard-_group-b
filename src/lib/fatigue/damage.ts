import type { SNCurve } from "./config";
import type { SpectralMoments } from "./spectrum";

/** Lanczos approximation of the Gamma function */
export function gammaFn(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < g + 2; i++) x += c[i]! / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export interface DamageResult {
  damage: number;
  /** Peak rate [Hz] */
  peakRate: number;
  /** Cycles in the exposure period */
  cycles: number;
  /** Irregularity factor α2 = m2 / sqrt(m0·m4) */
  irregularity: number;
  /** RMS stress [MPa] */
  sigmaRms: number;
}

/**
 * Dirlik spectral fatigue damage for a single-slope S-N curve over `durationSec`.
 * Uses the closed-form expectation E[S^m] of the Dirlik stress-range PDF.
 */
export function dirlikDamage(mom: SpectralMoments, sn: SNCurve, durationSec: number): DamageResult {
  const { m0, m1, m2, m4 } = mom;
  if (m0 <= 0 || m2 <= 0 || m4 <= 0) {
    return { damage: 0, peakRate: 0, cycles: 0, irregularity: 0, sigmaRms: 0 };
  }
  const peakRate = Math.sqrt(m4 / m2);
  const g = m2 / Math.sqrt(m0 * m4);
  const xm = (m1 / m0) * Math.sqrt(m2 / m4);
  const D1 = (2 * (xm - g * g)) / (1 + g * g);
  const R = (g - xm - D1 * D1) / (1 - g - D1 + D1 * D1);
  const D2 = (1 - g - D1 + D1 * D1) / (1 - R);
  const D3 = 1 - D1 - D2;
  const Q = (1.25 * (g - D3 - D2 * R)) / D1;
  const m = sn.m;
  const sqrtM0 = Math.sqrt(m0);
  const eSm =
    Math.pow(2 * sqrtM0, m) *
    (D1 * Math.pow(Q, m) * gammaFn(1 + m) +
      Math.pow(Math.SQRT2, m) * gammaFn(1 + m / 2) * (D2 * Math.pow(Math.abs(R), m) + D3));
  const a = Math.pow(10, sn.logA);
  const cycles = peakRate * durationSec;
  return {
    damage: (cycles * eSm) / a,
    peakRate,
    cycles,
    irregularity: g,
    sigmaRms: sqrtM0,
  };
}

/** Narrow-band (Rayleigh) damage, used as a reference/upper bound */
export function narrowBandDamage(mom: SpectralMoments, sn: SNCurve, durationSec: number): number {
  const { m0, m2 } = mom;
  if (m0 <= 0) return 0;
  const nu0 = Math.sqrt(m2 / m0);
  const a = Math.pow(10, sn.logA);
  return (
    ((nu0 * durationSec) / a) *
    Math.pow(2 * Math.SQRT2 * Math.sqrt(m0), sn.m) *
    gammaFn(1 + sn.m / 2)
  );
}
