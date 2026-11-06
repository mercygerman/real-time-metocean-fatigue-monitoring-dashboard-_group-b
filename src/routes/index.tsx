import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AlertHistoryPanel } from "@/components/monitor/AlertHistoryPanel";
import { DamageRatePanel } from "@/components/monitor/DamageRatePanel";
import { KpiStrip } from "@/components/monitor/KpiStrip";
import { MetoceanTrendPanel } from "@/components/monitor/MetoceanTrendPanel";
import { MonitorHeader } from "@/components/monitor/MonitorHeader";
import { SeaStatePanel } from "@/components/monitor/SeaStatePanel";
import { TrajectoryPanel } from "@/components/monitor/TrajectoryPanel";
import { useFatigueSimulation } from "@/hooks/use-fatigue-simulation";
import { LIFE, SN_CURVE, STRUCTURE } from "@/lib/fatigue/config";
import { projectLife } from "@/lib/fatigue/simulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fatigue Monitor — Real-time offshore structural fatigue dashboard" },
      {
        name: "description",
        content:
          "Simulated real-time fatigue monitoring: hourly metocean ingest, JONSWAP wave spectra, spectral fatigue damage, remaining life projection and threshold alerts.",
      },
      { property: "og:title", content: "Fatigue Monitor — Real-time offshore structural fatigue dashboard" },
      {
        property: "og:description",
        content: "Live sea state, hourly damage rate, cumulative damage trajectory and alert history for an offshore jacket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const sim = useFatigueSimulation();
  // History is always backfilled, so a latest record exists
  const rec = sim.history[sim.history.length - 1]!;
  const life = useMemo(() => projectLife(sim.history), [sim.history]);

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <MonitorHeader
        time={rec.time}
        running={sim.running}
        setRunning={sim.setRunning}
        speedIdx={sim.speedIdx}
        setSpeedIdx={sim.setSpeedIdx}
        injectStorm={sim.injectStorm}
        stormQueued={sim.stormQueued}
        reset={sim.reset}
        thresholds={sim.thresholds}
        setThresholds={sim.setThresholds}
      />

      <KpiStrip rec={rec} life={life} alerts={sim.alerts} thresholds={sim.thresholds} />

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SeaStatePanel rec={rec} />
        </div>
        <div className="xl:col-span-5">
          <MetoceanTrendPanel history={sim.history} thresholds={sim.thresholds} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <DamageRatePanel history={sim.history} thresholds={sim.thresholds} />
          <TrajectoryPanel history={sim.history} life={life} />
        </div>
        <div className="xl:col-span-4">
          <AlertHistoryPanel
            alerts={sim.alerts}
            now={rec.time}
            onAck={sim.acknowledge}
            onAckAll={sim.acknowledgeAll}
          />
        </div>
      </div>

      <footer className="grid gap-3 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground md:grid-cols-3">
        <p>
          <span className="panel-title mr-2">Method</span>
          JONSWAP spectrum (DNV-RP-C205 γ) → stress transfer function with hydrodynamic attenuation and SDOF
          dynamic amplification (fn {STRUCTURE.naturalFreq} Hz, ζ {STRUCTURE.damping * 100}%) → Dirlik
          rainflow PDF → Miner damage per hour.
        </p>
        <p>
          <span className="panel-title mr-2">S-N</span>
          {SN_CURVE.label}, m = {SN_CURVE.m}, log a = {SN_CURVE.logA}. DFF {LIFE.designFatigueFactor}, design life{" "}
          {LIFE.designLifeYears} y, in service {LIFE.serviceAgeYears} y.
        </p>
        <p>
          <span className="panel-title mr-2">Data</span>
          Simulated hourly metocean feed (seasonal AR(1) sea, Poisson storms, tidal current). 1× = one hour every
          2 s. Remaining life uses the rolling 30-day damage rate.
        </p>
      </footer>
    </main>
  );
}
