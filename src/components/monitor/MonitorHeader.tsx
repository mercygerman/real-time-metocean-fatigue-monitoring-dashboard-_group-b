import { CloudLightning, Pause, Play, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPEEDS } from "@/hooks/use-fatigue-simulation";
import { STRUCTURE } from "@/lib/fatigue/config";
import type { AlertThresholds } from "@/lib/fatigue/config";
import { fmtDateTime } from "@/lib/fatigue/format";
import { cn } from "@/lib/utils";
import { ThresholdsSheet } from "./ThresholdsSheet";

interface Props {
  time: number;
  running: boolean;
  setRunning: (v: boolean) => void;
  speedIdx: number;
  setSpeedIdx: (i: number) => void;
  injectStorm: () => void;
  stormQueued: boolean;
  reset: () => void;
  thresholds: AlertThresholds;
  setThresholds: (t: AlertThresholds) => void;
}

export function MonitorHeader(p: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-display tracking-[0.2em] uppercase">REAL-TIME METOCEAN FATIGUE MONITOR DASHBOARD</span>
          <span className="text-border">/</span>
          <span className="readout">{STRUCTURE.name}</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">BY Mercy, Hassanat, Gideon - Group B</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 flex items-center gap-3 rounded-md border border-border bg-panel px-3 py-1.5">
          <span
            className={cn(
              "size-2 rounded-full",
              p.running ? "animate-live-pulse bg-ok" : "bg-muted-foreground",
            )}
          />
          <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {p.running ? "Live" : "Paused"}
          </span>
          <span className="readout text-sm">{fmtDateTime(p.time)}</span>
        </div>

        <Button
          variant="instrument"
          size="sm"
          onClick={() => p.setRunning(!p.running)}
          aria-label={p.running ? "Pause simulation" : "Resume simulation"}
        >
          {p.running ? <Pause /> : <Play />}
          {p.running ? "Pause" : "Resume"}
        </Button>

        <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Simulation speed">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => p.setSpeedIdx(i)}
              data-active={i === p.speedIdx}
              className="readout h-8 bg-panel-raised px-3 text-xs text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
            >
              {s.label}
            </button>
          ))}
        </div>

        <Button variant="alarm" size="sm" onClick={p.injectStorm} disabled={p.stormQueued}>
          <CloudLightning />
          {p.stormQueued ? "Storm queued" : "Inject storm"}
        </Button>

        <ThresholdsSheet value={p.thresholds} onChange={p.setThresholds}>
          <Button variant="instrument" size="sm">
            <SlidersHorizontal />
            Thresholds
          </Button>
        </ThresholdsSheet>

        <Button variant="instrument" size="icon" className="size-8" onClick={p.reset} aria-label="Reset simulation">
          <RotateCcw />
        </Button>
      </div>
    </header>
  );
}
