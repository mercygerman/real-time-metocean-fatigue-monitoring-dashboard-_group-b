const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Locale-independent UTC formatting (identical on server and client) */
export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${pad(d.getUTCHours())}:00 UTC`;
}

export function fmtShort(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}h`;
}

export function fmtDay(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtSci(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  return v.toExponential(digits).replace("e", "×10^").replace("^+", "^");
}

/** Split scientific notation into mantissa and exponent for typographic display */
export function sciParts(v: number, digits = 2): { mantissa: string; exponent: number } {
  if (!Number.isFinite(v) || v === 0) return { mantissa: "0", exponent: 0 };
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  return { mantissa: (v / 10 ** exponent).toFixed(digits), exponent };
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export function compass(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function fmtDuration(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 48) return `${h} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export function fmtYears(y: number): string {
  if (!Number.isFinite(y) || y > 99) return "> 99";
  return y.toFixed(1);
}
