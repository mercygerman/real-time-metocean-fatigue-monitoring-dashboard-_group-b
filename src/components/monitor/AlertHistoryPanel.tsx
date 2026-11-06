import { AlertTriangle, Check, CheckCheck, OctagonAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RULE_LABELS, type Alert } from "@/lib/fatigue/alerts";
import { fmtDateTime, fmtDuration } from "@/lib/fatigue/format";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

type Filter = "all" | "active" | "unack";

export function AlertHistoryPanel({
  alerts,
  now,
  onAck,
  onAckAll,
}: {
  alerts: Alert[];
  now: number;
  onAck: (id: string) => void;
  onAckAll: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = alerts
    .filter((a) => (filter === "active" ? a.status === "active" : filter === "unack" ? !a.acknowledged : true))
    .slice(0, 60);
  const counts = {
    all: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    unack: alerts.filter((a) => !a.acknowledged).length,
  };

  return (
    <Panel
      title="Alert history"
      subtitle="Threshold exceedance episodes, newest first"
      className="h-full"
      actions={
        <Button variant="instrument" size="sm" onClick={onAckAll} disabled={!counts.unack}>
          <CheckCheck />
          Ack all
        </Button>
      }
    >
      <div className="mb-3 flex gap-1" role="tablist">
        {(["all", "active", "unack"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            data-active={filter === f}
            className="rounded px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-secondary data-[active=true]:text-foreground"
          >
            {f === "all" ? "All" : f === "active" ? "Active" : "Unacknowledged"}
            <span className="readout ml-1.5 text-[10px] opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      <ol className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
        {shown.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            No alerts in this view.
          </li>
        )}
        {shown.map((a) => {
          const crit = a.severity === "critical";
          const active = a.status === "active";
          return (
            <li
              key={a.id}
              className={cn(
                "rounded-md border px-3 py-2.5 transition-colors",
                active
                  ? crit
                    ? "border-critical/60 bg-critical/10"
                    : "border-warning/50 bg-warning/10"
                  : "border-border bg-panel-raised/40",
              )}
            >
              <div className="flex items-start gap-2.5">
                {crit ? (
                  <OctagonAlert className={cn("mt-0.5 size-4 shrink-0", active ? "text-critical" : "text-critical/60")} />
                ) : (
                  <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", active ? "text-warning" : "text-warning/60")} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">{RULE_LABELS[a.rule]}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 text-[10px] font-semibold tracking-wider uppercase",
                        crit ? "bg-critical/20 text-critical" : "bg-warning/20 text-warning",
                      )}
                    >
                      {a.severity}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] tracking-wider uppercase",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {active ? "● active" : "resolved"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.message}</p>
                  <div className="readout mt-1.5 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground/80">
                    <span>{fmtDateTime(a.startTime)}</span>
                    <span>{fmtDuration((a.endTime ?? now) - a.startTime + 3_600_000)}</span>
                  </div>
                </div>
                {!a.acknowledged ? (
                  <Button
                    variant="instrument"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onAck(a.id)}
                    aria-label="Acknowledge alert"
                  >
                    Ack
                  </Button>
                ) : (
                  <Check className="mt-1 size-3.5 text-ok" aria-label="Acknowledged" />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
