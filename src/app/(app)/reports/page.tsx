"use client";
import * as React from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Bars, Donut } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { fmtCurrency, downloadCsv, sum } from "@/lib/utils";
import { STAGES, STAGE_LABEL, STAGE_SLA_DAYS, CLIENT_TYPE_LABEL } from "@/lib/constants";
import { avgDaysToLive, daysInStage, specialistName, daysToLive } from "@/lib/selectors";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const d = useStore();
  const nonChurned = d.clients.filter((c) => c.health !== "churned");
  const funnel = STAGES.map((s, i) => ({ label: STAGE_LABEL[s], Reached: nonChurned.filter((c) => STAGES.indexOf(c.stage) >= i).length }));
  const aging = STAGES.filter((s) => s !== "live").map((s) => {
    const inStage = d.clients.filter((c) => c.stage === s && c.health === "active");
    return { label: STAGE_LABEL[s], "Avg days in stage": inStage.length ? Math.round(sum(inStage.map(daysInStage)) / inStage.length) : 0, "SLA target": STAGE_SLA_DAYS[s] };
  });
  const pipelineAum = sum(nonChurned.filter((c) => c.stage !== "live").map((c) => c.expectedAumUsd));
  const liveAum = sum(d.clients.filter((c) => c.stage === "live").map((c) => c.expectedAumUsd));
  const revenue = sum(nonChurned.map((c) => c.pricing.setupFee + c.pricing.annualFee + c.pricing.perVehicleFee * c.expectedVehicles));
  const bySource = Object.entries(nonChurned.reduce<Record<string, number>>((a, c) => { a[c.source] = (a[c.source] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));
  const conversion = d.clients.length ? Math.round((d.clients.filter((c) => c.stage === "live").length / d.clients.length) * 100) : 0;

  return (
    <>
      <PageHeader title="Reports" subtitle="Funnel, cycle time and expected revenue" actions={<Button variant="outline" onClick={() => downloadCsv("onboarding-report.csv", d.clients.map((c) => ({ firm: c.firm, type: CLIENT_TYPE_LABEL[c.type], stage: c.stage, health: c.health, specialist: specialistName(d, c.specialistId), days_in_stage: daysInStage(c), days_to_live: daysToLive(c) ?? "", expected_aum: c.expectedAumUsd, plan: c.pricing.plan, est_first_year_revenue: c.pricing.setupFee + c.pricing.annualFee + c.pricing.perVehicleFee * c.expectedVehicles })))}><Download className="h-4 w-4" /> Export CSV</Button>} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Intake → live conversion" value={`${conversion}%`} hint={`${d.clients.filter((c) => c.health === "churned").length} churned`} tone="brand" />
        <Stat label="Avg. days to live" value={avgDaysToLive(d) ?? "—"} hint="target 27 days" tone="teal" />
        <Stat label="Expected AUM in pipeline" value={fmtCurrency(pipelineAum, { compact: true })} hint={`${fmtCurrency(liveAum, { compact: true })} already live`} tone="violet" />
        <Stat label="Est. first-year revenue" value={fmtCurrency(revenue, { compact: true })} hint="setup + annual + per-vehicle" tone="success" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader title="Stage funnel" subtitle="Clients that reached each stage (excluding churned)" /><CardBody><Bars data={funnel} keys={[{ key: "Reached", label: "Clients" }]} money={false} height={240} /></CardBody></Card>
        <Card><CardHeader title="Lead source" /><CardBody><Donut data={bySource} height={170} money={false} /></CardBody></Card>
        <Card className="xl:col-span-3"><CardHeader title="Cycle time vs. SLA" subtitle="Average days active clients have spent in their current stage" /><CardBody><Bars data={aging} keys={[{ key: "Avg days in stage", label: "Avg days" }, { key: "SLA target", label: "SLA target", color: "var(--fg-faint)" }]} money={false} height={220} /></CardBody></Card>
      </div>
    </>
  );
}
