"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, Building2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader, Progress, Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/table";
import { StatusBadge, stageTone, healthTone, riskTone, Badge, planTone } from "@/components/ui/badge";
import { fmtCurrency, fmtDate, downloadCsv, cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL, CLIENT_TYPE_LABEL } from "@/lib/constants";
import { daysInStage, isOverSla, progressPct, slaDays, specialistName } from "@/lib/selectors";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const d = useStore();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState("all");
  const [health, setHealth] = React.useState("active");
  const rows = d.clients.filter((c) => (stage === "all" || c.stage === stage) && (health === "all" || c.health === health) && (!q || c.firm.toLowerCase().includes(q.toLowerCase()) || c.country.toLowerCase().includes(q.toLowerCase()) || specialistName(d, c.specialistId).toLowerCase().includes(q.toLowerCase())));

  const columns: Column<Client>[] = [
    { key: "firm", header: "Client", sortValue: (c) => c.firm, render: (c) => (<div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Building2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-medium">{c.firm}</p><p className="truncate text-xs text-muted">{CLIENT_TYPE_LABEL[c.type]} · {c.country}</p></div></div>) },
    { key: "stage", header: "Stage", sortValue: (c) => STAGES.indexOf(c.stage), render: (c) => <div className="flex items-center gap-1.5"><StatusBadge status={c.stage} map={stageTone} label={STAGE_LABEL[c.stage]} />{c.health !== "active" ? <StatusBadge status={c.health} map={healthTone} /> : null}</div> },
    { key: "progress", header: "Progress", width: "160px", sortValue: (c) => progressPct(d, c.id), render: (c) => { const p = progressPct(d, c.id); return <div className="flex items-center gap-2"><Progress value={p} className="flex-1" tone={p === 100 ? "success" : "brand"} /><span className="w-9 text-right text-xs text-muted tnum">{p}%</span></div>; } },
    { key: "age", header: "In stage", align: "right", sortValue: (c) => daysInStage(c), render: (c) => c.stage === "live" ? <span className="text-faint">—</span> : <span className={cn("tnum", isOverSla(c) ? "font-semibold text-danger" : "text-muted")}>{daysInStage(c)}d / {slaDays(c)}d</span> },
    { key: "specialist", header: "Specialist", sortValue: (c) => specialistName(d, c.specialistId), render: (c) => <div className="flex items-center gap-2"><Avatar name={specialistName(d, c.specialistId)} size="sm" /><span className="text-muted">{specialistName(d, c.specialistId)}</span></div> },
    { key: "plan", header: "Plan", sortValue: (c) => c.pricing.plan, render: (c) => <Badge tone={planTone[c.pricing.plan]}>{c.pricing.plan}</Badge> },
    { key: "risk", header: "Risk", sortValue: (c) => c.riskRating, render: (c) => <StatusBadge status={c.riskRating} map={riskTone} /> },
    { key: "aum", header: "Expected AUM", align: "right", sortValue: (c) => c.expectedAumUsd, render: (c) => <span className="font-medium">{fmtCurrency(c.expectedAumUsd, { compact: true })}</span> },
    { key: "created", header: "Created", sortValue: (c) => c.createdAt, render: (c) => <span className="text-muted">{fmtDate(c.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Clients" subtitle={`${d.clients.length} fund managers across all stages`} actions={<><Button variant="outline" onClick={() => downloadCsv("clients.csv", d.clients.map((c) => ({ firm: c.firm, type: c.type, country: c.country, stage: c.stage, health: c.health, specialist: specialistName(d, c.specialistId), plan: c.pricing.plan, expected_aum: c.expectedAumUsd, progress_pct: progressPct(d, c.id), created: c.createdAt.slice(0, 10) })))}><Download className="h-4 w-4" /> Export</Button><Link href="/clients/new"><Button><Plus className="h-4 w-4" /> New client</Button></Link></>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" /><Input className="pl-9" placeholder="Search firm, country, specialist…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="w-full sm:w-44"><Select value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select></div>
        <div className="w-full sm:w-44"><Select value={health} onChange={(e) => setHealth(e.target.value)}><option value="active">Active</option><option value="on_hold">On hold</option><option value="churned">Churned</option><option value="all">All</option></Select></div>
      </div>
      <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/clients/${c.id}`)} initialSort={{ key: "stage", dir: "asc" }} empty="No clients match your filters" />
    </>
  );
}
