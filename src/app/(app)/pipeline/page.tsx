"use client";
import * as React from "react";
import { useStore } from "@/lib/store";
import { PageHeader, SegmentedControl } from "@/components/ui/misc";
import { Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ClientCard } from "@/components/domain/client-card";
import { StatusBadge, stageTone } from "@/components/ui/badge";
import { STAGES, STAGE_LABEL, STAGE_SLA_DAYS } from "@/lib/constants";
import { cn, fmtCurrency } from "@/lib/utils";
import type { Stage } from "@/lib/types";

export default function PipelinePage() {
  const d = useStore();
  const [specialist, setSpecialist] = React.useState("all");
  const [show, setShow] = React.useState<"active" | "all">("active");
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overStage, setOverStage] = React.useState<Stage | null>(null);
  const clients = d.clients.filter((c) => (specialist === "all" || c.specialistId === specialist) && (show === "all" || c.health === "active"));

  const drop = (stage: Stage) => {
    if (!dragId) return;
    const r = d.moveToStage(dragId, stage);
    if (!r.ok) toast.error(r.blockers?.length ? `${r.error}: ${r.blockers[0]}${r.blockers.length > 1 ? ` (+${r.blockers.length - 1} more)` : ""}` : r.error);
    else if (r.message) toast.success(r.message);
    setDragId(null);
    setOverStage(null);
  };

  return (
    <>
      <PageHeader title="Pipeline" subtitle="Drag a client to the next stage – gates are enforced" actions={<SegmentedControl options={[{ value: "active", label: "Active" }, { value: "all", label: "Incl. on hold / churned" }]} value={show} onChange={setShow} />} />
      <div className="mb-4 w-full sm:w-72"><Select value={specialist} onChange={(e) => setSpecialist(e.target.value)}><option value="all">All specialists</option>{d.specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
      <div className="scroll-area -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {STAGES.map((stage) => {
          const items = clients.filter((c) => c.stage === stage);
          const aum = items.reduce((a, c) => a + c.expectedAumUsd, 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); if (overStage !== stage) setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => drop(stage)}
              className={cn("flex w-[280px] shrink-0 flex-col rounded-xl border bg-subtle/40 transition-colors", overStage === stage && dragId ? "border-brand bg-brand-soft/40" : "border-border")}
            >
              <div className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><StatusBadge status={stage} map={stageTone} label={STAGE_LABEL[stage]} /><span className="text-xs text-faint tnum">{items.length}</span></div>
                  <span className="text-xs text-muted tnum">{fmtCurrency(aum, { compact: true })}</span>
                </div>
                <p className="mt-1 text-[11px] text-faint">{stage === "live" ? "Handed off to fund admin" : `Target ${STAGE_SLA_DAYS[stage]} days`}</p>
              </div>
              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {items.length === 0 ? <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-faint">Drop here</div> : null}
                {items.map((c) => <ClientCard key={c.id} client={c} draggable={c.health === "active" && stage !== "live"} onDragStart={() => setDragId(c.id)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
