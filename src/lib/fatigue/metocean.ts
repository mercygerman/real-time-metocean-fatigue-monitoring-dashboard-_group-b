import { createRng, type Rng } from "./rng";

export interface MetoceanReading {
  /** Epoch ms at the start of the hour (UTC) */
  time: number;
  /** Significant wave height [m] */
  hs: number;
  /** Spectral peak period [s] */
  tp: number;
  /** Mean wave direction, coming from [deg] */
  waveDir: number;
  /** 10-min mean wind speed at 10 m [m/s] */
  windSpeed: number;
  windDir: number;
  /** Surface current speed [m/s] */
  current: number;
  /** True while a storm event is driving the sea state */
  storm: boolean;
}

interface Storm {
  start: number; // hour index
  duration: number;
  peakHs: number;
  dir: number;
}

const HOUR_MS = 3_600_000;
const wrap = (d: number) => ((d % 360) + 360) % 360;

/**
 * Synthetic hourly metocean generator: seasonal log-normal background sea,
 * AR(1) persistence, Poisson storm events and a semi-diurnal tidal current.
 */
export class MetoceanGenerator {
  private rng: Rng;
  private hour = 0;
  private hsAnom = 0;
  private tpAnom = 0;
  private windAnom = 0;
  private baseDir = 250;
  private storms: Storm[] = [];

  constructor(
    private readonly startTime: number,
    seed = 20261106,
  ) {
    this.rng = createRng(seed);
  }

  get currentHour() {
    return this.hour;
  }

  /** Schedule a storm starting at the next generated hour */
  injectStorm(peakHs?: number) {
    this.storms.push({
      start: this.hour,
      duration: Math.round(this.rng.uniform(30, 48)),
      peakHs: peakHs ?? this.rng.uniform(8.8, 10.2),
      dir: this.rng.uniform(205, 245),
    });
  }

  next(): MetoceanReading {
    const r = this.rng;
    const h = this.hour;
    const time = this.startTime + h * HOUR_MS;

    // Random storm genesis: ~1 event every 7 days
    if (r.next() < 1 / (24 * 7) && !this.storms.some((s) => h < s.start + s.duration)) {
      this.storms.push({
        start: h,
        duration: Math.round(r.uniform(20, 54)),
        peakHs: r.uniform(5.2, 9.0),
        dir: r.uniform(200, 300),
      });
    }

    // Background sea: AR(1) in log space, winter-biased seasonal mean
    const phi = 0.97;
    this.hsAnom = phi * this.hsAnom + Math.sqrt(1 - phi * phi) * 0.38 * r.normal();
    const doy = new Date(time).getUTCDate() + new Date(time).getUTCMonth() * 30.4;
    const seasonal = 0.25 * Math.cos((2 * Math.PI * (doy - 15)) / 365);
    const hsBase = Math.exp(Math.log(1.7) + seasonal + this.hsAnom);

    // Storm contribution (energy sum), sin² growth/decay profile
    let stormHs = 0;
    let stormDir = 0;
    let inStorm = false;
    for (const s of this.storms) {
      const x = (h - s.start) / s.duration;
      if (x >= 0 && x <= 1) {
        const prof = Math.pow(Math.sin(Math.PI * x), 1.6);
        const v = s.peakHs * prof;
        if (v > stormHs) {
          stormHs = v;
          stormDir = s.dir;
        }
        inStorm = inStorm || prof > 0.35;
      }
    }
    this.storms = this.storms.filter((s) => h < s.start + s.duration + 1);
    const hs = Math.sqrt(hsBase * hsBase + stormHs * stormHs);

    // Peak period: steepness-limited relation with persistent noise
    this.tpAnom = 0.9 * this.tpAnom + 0.25 * r.normal();
    const tp = Math.max(3.2, 3.3 * Math.sqrt(hs) + 2.4 + this.tpAnom);

    // Direction: slow wander, pulled toward storm direction when active
    this.baseDir = wrap(this.baseDir + 2.5 * r.normal() + 0.02 * (250 - this.baseDir));
    const w = stormHs > 0 ? Math.min(1, (stormHs / hs) ** 2) : 0;
    const waveDir = wrap(this.baseDir * (1 - w) + stormDir * w);

    // Wind
    this.windAnom = 0.85 * this.windAnom + 0.6 * r.normal();
    const windSpeed = Math.max(0.5, 4.3 * Math.pow(hs, 0.78) + this.windAnom);
    const windDir = wrap(waveDir + 12 * r.normal());

    // Tidal + wind-driven current
    const current = Math.max(
      0.02,
      0.32 + 0.24 * Math.sin((2 * Math.PI * h) / 12.42) + 0.025 * windSpeed + 0.03 * r.normal(),
    );

    this.hour += 1;
    return {
      time,
      hs: +hs.toFixed(3),
      tp: +tp.toFixed(2),
      waveDir: +waveDir.toFixed(1),
      windSpeed: +windSpeed.toFixed(2),
      windDir: +windDir.toFixed(1),
      current: +current.toFixed(3),
      storm: inStorm,
    };
  }
}
