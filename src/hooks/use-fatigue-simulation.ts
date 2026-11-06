import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { updateAlerts, type Alert } from "@/lib/fatigue/alerts";
import { DEFAULT_THRESHOLDS, LIFE, type AlertThresholds } from "@/lib/fatigue/config";
import { MetoceanGenerator, type MetoceanReading } from "@/lib/fatigue/metocean";
import { buildRecord, type HourRecord } from "@/lib/fatigue/simulation";

/** Monitoring starts 30 days before the "live" point so the rolling windows are populated. */
export const BACKFILL_HOURS = 720;
export const SIM_START = Date.UTC(2026, 9, 7, 0, 0, 0);
/** Retain 90 days of hourly records in memory */
const MAX_HISTORY = 24 * 90;
const MAX_ALERTS = 200;

export const SPEEDS = [
  { label: "1×", msPerHour: 2000 },
  { label: "5×", msPerHour: 400 },
  { label: "20×", msPerHour: 100 },
] as const;

interface State {
  history: HourRecord[];
  alerts: Alert[];
  thresholds: AlertThresholds;
  /** Index of the next hour to be ingested */
  nextIndex: number;
  lastRaised: Alert[];
}

type Action =
  | { type: "ingest"; reading: MetoceanReading }
  | { type: "reset"; state: State }
  | { type: "ack"; id: string }
  | { type: "ackAll" }
  | { type: "thresholds"; value: AlertThresholds };

function ingest(state: State, reading: MetoceanReading): State {
  const prev = state.history[state.history.length - 1];
  const rec = buildRecord(reading, state.nextIndex, prev ? prev.cumDamage : LIFE.initialDamage);
  const history = state.history.concat(rec);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  const { alerts: updated, raised } = updateAlerts(state.alerts, history, state.thresholds);
  const alerts = updated.length > MAX_ALERTS ? updated.slice(0, MAX_ALERTS) : updated;
  return { ...state, history, alerts, nextIndex: state.nextIndex + 1, lastRaised: raised };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ingest":
      return ingest(state, action.reading);
    case "reset":
      return action.state;
    case "ack":
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, acknowledged: true } : a)),
      };
    case "ackAll":
      return { ...state, alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })) };
    case "thresholds":
      return { ...state, thresholds: action.value };
  }
}

function bootstrap(gen: MetoceanGenerator, thresholds: AlertThresholds): State {
  let s: State = { history: [], alerts: [], thresholds, nextIndex: 0, lastRaised: [] };
  for (let i = 0; i < BACKFILL_HOURS; i++) s = ingest(s, gen.next());
  // Episodes from the backfilled period were handled by the previous shift
  return { ...s, alerts: s.alerts.map((a) => ({ ...a, acknowledged: true })), lastRaised: [] };
}

export function useFatigueSimulation() {
  // Initializer must be pure (React may call it twice): each call gets its own generator.
  const [initial] = useState(() => {
    const gen = new MetoceanGenerator(SIM_START);
    return { gen, state: bootstrap(gen, DEFAULT_THRESHOLDS) };
  });
  const genRef = useRef<MetoceanGenerator>(initial.gen);
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [running, setRunning] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [stormQueued, setStormQueued] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      dispatch({ type: "ingest", reading: genRef.current!.next() });
      setStormQueued(false);
    }, SPEEDS[speedIdx]?.msPerHour ?? 2000);
    return () => window.clearInterval(id);
  }, [running, speedIdx]);

  // Surface newly raised alerts as toasts
  useEffect(() => {
    for (const a of state.lastRaised) {
      const fn = a.severity === "critical" ? toast.error : toast.warning;
      fn(a.severity === "critical" ? "Critical alert" : "Warning", { description: a.message });
    }
  }, [state.lastRaised]);

  const reset = useCallback(() => {
    genRef.current = new MetoceanGenerator(SIM_START);
    dispatch({ type: "reset", state: bootstrap(genRef.current, state.thresholds) });
  }, [state.thresholds]);

  const injectStorm = useCallback(() => {
    genRef.current?.injectStorm();
    setStormQueued(true);
  }, []);

  return {
    ...state,
    running,
    setRunning,
    speedIdx,
    setSpeedIdx,
    stormQueued,
    reset,
    injectStorm,
    acknowledge: (id: string) => dispatch({ type: "ack", id }),
    acknowledgeAll: () => dispatch({ type: "ackAll" }),
    setThresholds: (value: AlertThresholds) => dispatch({ type: "thresholds", value }),
  };
}
