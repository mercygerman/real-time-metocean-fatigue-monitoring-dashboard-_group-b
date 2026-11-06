import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DEFAULT_THRESHOLDS, designHourlyBudget, type AlertThresholds } from "@/lib/fatigue/config";
import { fmtSci } from "@/lib/fatigue/format";

const FIELDS: { group: string; hint: string; items: { key: keyof AlertThresholds; label: string; step: number }[] }[] = [
  {
    group: "Hourly damage rate",
    hint: "Multiples of the design hourly budget",
    items: [
      { key: "hourlyWarnX", label: "Warning ×", step: 1 },
      { key: "hourlyCritX", label: "Critical ×", step: 1 },
    ],
  },
  {
    group: "Rolling 24 h damage",
    hint: "Multiples of the design daily budget",
    items: [
      { key: "dailyWarnX", label: "Warning ×", step: 0.5 },
      { key: "dailyCritX", label: "Critical ×", step: 0.5 },
    ],
  },
  {
    group: "Significant wave height",
    hint: "Metres",
    items: [
      { key: "hsWarn", label: "Warning m", step: 0.5 },
      { key: "hsCrit", label: "Critical m", step: 0.5 },
    ],
  },
  {
    group: "Remaining life",
    hint: "Projected life ÷ remaining design life",
    items: [
      { key: "lifeWarnRatio", label: "Warning below", step: 0.05 },
      { key: "lifeCritRatio", label: "Critical below", step: 0.05 },
    ],
  },
];

export function ThresholdsSheet({
  value,
  onChange,
  children,
}: {
  value: AlertThresholds;
  onChange: (t: AlertThresholds) => void;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value);
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-auto border-border bg-panel">
        <SheetHeader>
          <SheetTitle className="font-display">Alert thresholds</SheetTitle>
          <SheetDescription>
            Design hourly budget: <span className="readout text-foreground">{fmtSci(designHourlyBudget())}</span>.
            Changes apply from the next ingested hour.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6 px-4">
          {FIELDS.map((g) => (
            <fieldset key={g.group} className="space-y-2">
              <legend className="panel-title">{g.group}</legend>
              <p className="text-xs text-muted-foreground">{g.hint}</p>
              <div className="grid grid-cols-2 gap-3">
                {g.items.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key} className="text-xs">
                      {f.label}
                    </Label>
                    <Input
                      id={f.key}
                      type="number"
                      step={f.step}
                      min={0}
                      className="readout"
                      value={draft[f.key]}
                      onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex gap-2 pb-6">
            <Button
              className="flex-1"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
            <Button variant="instrument" onClick={() => setDraft(DEFAULT_THRESHOLDS)}>
              Defaults
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
