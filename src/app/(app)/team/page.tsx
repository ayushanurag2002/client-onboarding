"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader, Avatar, Progress } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, stageTone, Badge } from "@/components/ui/badge";
import { specialistLoad, isOverSla, daysInStage, slaDays } from "@/lib/selectors";
import { STAGE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function TeamPage() {
  const d = useStore();
  const load = specialistLoad(d);
  return (
    <>
      <PageHeader title="Team" subtitle="Onboarding specialists, capacity and current assignments" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {load.map((l) => {
          const mine = d.clients.filter((c) => c.specialistId === l.specialist.id && c.health === "active" && c.stage !== "live");
          return (
            <Card key={l.specialist.id}>
              <CardHeader title={<span className="flex items-center gap-3"><Avatar name={l.specialist.name} />{l.specialist.name}</span>} subtitle={`${l.specialist.title} · ${l.specialist.email}`} action={<Badge tone={l.utilisation > 90 ? "danger" : l.utilisation > 70 ? "warning" : "success"}>{l.utilisation}% utilised</Badge>} />
              <CardBody>
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-subtle/60 p-2"><p className="text-lg font-semibold tnum">{l.active}<span className="text-xs text-faint">/{l.specialist.capacity}</span></p><p className="text-[11px] text-faint">active clients</p></div>
                  <div className="rounded-lg bg-subtle/60 p-2"><p className={cn("text-lg font-semibold tnum", l.overSla && "text-danger")}>{l.overSla}</p><p className="text-[11px] text-faint">over SLA</p></div>
                  <div className="rounded-lg bg-subtle/60 p-2"><p className="text-lg font-semibold tnum">{l.openTasks}</p><p className="text-[11px] text-faint">open tasks</p></div>
                </div>
                <Progress value={l.utilisation} tone={l.utilisation > 90 ? "danger" : l.utilisation > 70 ? "warning" : "brand"} className="mb-4" />
                <div className="divide-y divide-border rounded-lg border border-border">
                  {mine.length === 0 ? <p className="px-3 py-4 text-center text-xs text-muted">No active assignments</p> : null}
                  {mine.map((c) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-hover">
                      <span className="truncate text-sm font-medium">{c.firm}</span>
                      <span className="flex items-center gap-2"><StatusBadge status={c.stage} map={stageTone} label={STAGE_LABEL[c.stage]} /><span className={cn("w-16 text-right text-xs tnum", isOverSla(c) ? "font-semibold text-danger" : "text-faint")}>{daysInStage(c)}d/{slaDays(c)}d</span></span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
