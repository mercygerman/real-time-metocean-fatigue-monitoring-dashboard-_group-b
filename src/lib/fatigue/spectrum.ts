import type { StructureConfig } from "./config";

const G = 9.81;

export const FREQ_MIN = 0.02;
export const FREQ_MAX = 0.6;
export const FREQ_STEP = 0.0025;

/** Uniform frequency grid in Hz */
export const FREQS: number[] = (() => {
  const out: number[] = [];
  for (let f = FREQ_MIN; f <= FREQ_MAX + 1e-9; f += FREQ_STEP) out.push(+f.toFixed(5));
  return out;
})();

/** JONSWAP peak enhancement factor per DNV-RP-C205 */
export function jonswapGamma(hs: number, tp: number): number {
  const r = tp / Math.sqrt(hs);
  if (r <= 3.6) return 5;
  if (r >= 5) return 1;
  return Math.exp(5.75 - 1.15 * r);
}

/**
 * JONSWAP wave elevation spectrum S(f) [m²/Hz], normalised so that m0 = Hs²/16.
 */
export function jonswapSpectrum(hs: number, tp: number, gamma: number, freqs = FREQS): number[] {
  const fp = 1 / tp;
  const raw = freqs.map((f) => {
    const sigma = f <= fp ? 0.07 : 0.09;
    const pm = Math.pow(f, -5) * Math.exp(-1.25 * Math.pow(f / fp, -4));
    const peak = Math.pow(gamma, Math.exp(-((f - fp) ** 2) / (2 * sigma * sigma * fp * fp)));
    return pm * peak;
  });
  const m0Raw = integrate(raw, freqs);
  const target = (hs * hs) / 16;
  const k = m0Raw > 0 ? target / m0Raw : 0;
  return raw.map((s) => s * k);
}

/** |H(f)| stress transfer function from wave elevation to hotspot stress [MPa/m] */
export function stressTransfer(f: number, dirDeg: number, s: StructureConfig): number {
  const k = ((2 * Math.PI * f) ** 2) / G; // deep-water wavenumber
  const attenuation = Math.exp(-k * s.attenuationDepth);
  const r = f / s.naturalFreq;
  const daf = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * s.damping * r) ** 2);
  const dRad = ((dirDeg - s.criticalDirection) * Math.PI) / 180;
  const dirFactor = 0.6 + 0.4 * Math.cos(dRad) ** 2;
  return s.stressGain * attenuation * daf * dirFactor;
}

/** Stress response spectrum S_σ(f) = |H(f)|² · S_η(f) [MPa²/Hz] */
export function stressSpectrum(
  wave: number[],
  dirDeg: number,
  s: StructureConfig,
  freqs = FREQS,
): number[] {
  return wave.map((sw, i) => stressTransfer(freqs[i]!, dirDeg, s) ** 2 * sw);
}

/** Trapezoidal integration */
export function integrate(y: number[], x: number[]): number {
  let sum = 0;
  for (let i = 1; i < y.length; i++) sum += 0.5 * (y[i]! + y[i - 1]!) * (x[i]! - x[i - 1]!);
  return sum;
}

export interface SpectralMoments {
  m0: number;
  m1: number;
  m2: number;
  m4: number;
}

export function spectralMoments(s: number[], freqs = FREQS): SpectralMoments {
  const mk = (k: number) =>
    integrate(
      s.map((v, i) => v * Math.pow(freqs[i]!, k)),
      freqs,
    );
  return { m0: mk(0), m1: mk(1), m2: mk(2), m4: mk(4) };
}
