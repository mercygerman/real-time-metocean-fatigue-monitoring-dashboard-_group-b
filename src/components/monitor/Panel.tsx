import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel flex flex-col", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="panel-title">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

/** Shared recharts styling driven by design tokens */
export const chartTheme = {
  grid: "var(--grid)",
  axis: "var(--muted-foreground)",
  tick: { fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" },
  tooltip: {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      color: "var(--popover-foreground)",
    },
    labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
    itemStyle: { padding: 0 },
    cursor: { stroke: "var(--grid)", fill: "color-mix(in oklab, var(--foreground) 5%, transparent)" },
  },
} as const;
