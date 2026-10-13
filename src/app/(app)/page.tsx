"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader, Stat, Avatar, Progress } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bars, Donut } from "@/components/charts/charts";
import { Badge, StatusBadge, stageTone, priorityTone } from "@/components/ui/badge";
import { fmtDate, relativeTime, daysUntil, cn } from "@/lib/utils";
import { STAGE_LABEL, CLIENT_TYPE_LABEL } from "@/lib/constants";
import { stageCounts, isOverSla, daysInStage, slaDays, avgDaysToLive, specialistLoad, specialistName, clientName, progressPct } from "@/lib/selectors";
import { Rocket, AlertTriangle, Users, Clock, CalendarCheck, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const d = useStore();
  const active = d.clients.filter((c) => c.health === "active" && c.stage !== "live");
  const liveThisMonth = d.clients.filter((c) => c.wentLiveAt && new Date(c.wentLiveAt).getMonth() === new Date().getMonth());
  const breaches = active.filter(isOverSla);
  const avgLive = avgDaysToLive(d);
  const openTasks = d.tasks.filter((t) => t.status !== "done");
  const kickoffTasks = openTasks.filter((t) => /kick-off/i.test(t.title)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const byType = Object.entries(d.clients.filter((c) => c.health !== "churned").reduce<Record<string, number>>((acc, c) => { acc[CLIENT_TYPE_LABEL[c.type]] = (acc[CLIENT_TYPE_LABEL[c.type]] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const attention = [...active].sort((a, b) => (daysInStage(b) - slaDays(b)) - (daysInStage(a) - slaDays(a))).slice(0, 5);

  return (
    <>
      <PageHeader title="Onboarding overview" subtitle={`${active.length} clients in flight · ${breaches.length} over SLA · ${openTasks.length} open tasks`} actions={<Link href="/clients/new"><Button>New client</Button></Link>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active onboardings" value={active.length} hint={`${d.clients.filter((c) => c.health === "on_hold").length} on hold`} icon={<Users className="h-4 w-4" />} tone="brand" />
        <Stat label="Went live" value={d.clients.filter((c) => c.stage === "live").length} hint={`${liveThisMonth.length} this month`} icon={<Rocket className="h-4 w-4" />} tone="success" />
        <Stat label="Avg. days to live" value={avgLive ?? "—"} hint="intake → live" icon={<Clock className="h-4 w-4" />} tone="teal" />
        <Stat label="SLA breaches" value={breaches.length} hint={breaches.length ? breaches.map((c) => c.firm).slice(0, 2).join(", ") : "all within target"} icon={<AlertTriangle className="h-4 w-4" />} tone={breaches.length ? "warning" : "success"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Pipeline by stage" subtitle="Active clients only" action={<Link href="/pipeline" className="text-[13px] font-medium text-brand hover:underline">Open board</Link>} />
          <CardBody><Bars data={stageCounts(d).map((s) => ({ label: s.label, Clients: s.count }))} keys={[{ key: "Clients", label: "Clients" }]} money={false} height={220} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Clients by type" />
          <CardBody><Donut data={byType} height={170} money={false} /></CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Needs attention" subtitle="Longest in stage relative to SLA" />
          <CardBody className="space-y-2">
            {attention.map((c) => {
              const days = daysInStage(c);
              const over = isOverSla(c);
              const pct = progressPct(d, c.id);
              return (
                <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-4 rounded-lg border border-border px-3.5 py-3 transition-colors hover:bg-hover">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{c.firm}</p><StatusBadge status={c.stage} map={stageTone} label={STAGE_LABEL[c.stage]} /></div>
                    <p className="text-xs text-muted">{specialistName(d, c.specialistId)} · {CLIENT_TYPE_LABEL[c.type]}</p>
                  </div>
                  <div className="hidden w-40 sm:block"><div className="flex justify-between text-[11px] text-faint"><span>progress</span><span className="tnum">{pct}%</span></div><Progress value={pct} className="mt-1" /></div>
                  <span className={cn("w-20 text-right text-xs tnum", over ? "font-semibold text-danger" : "text-muted")}>{days}d / {slaDays(c)}d</span>
                  <ArrowRight className="h-4 w-4 text-faint" />
                </Link>
              );
            })}
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Kick-off calls" subtitle="Scheduled & pending" />
            <CardBody className="space-y-2">
              {kickoffTasks.length === 0 ? <p className="text-sm text-muted">No kick-offs scheduled.</p> : null}
              {kickoffTasks.slice(0, 4).map((t) => (
                <Link key={t.id} href={t.clientId ? `/clients/${t.clientId}` : "/tasks"} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-hover">
                  <CalendarCheck className={cn("h-4 w-4", daysUntil(t.dueDate) < 0 ? "text-danger" : "text-brand")} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{clientName(d, t.clientId)}</p><p className="text-xs text-muted">{fmtDate(t.dueDate)} · {specialistName(d, t.assigneeId)}</p></div>
                  <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                </Link>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Team load" action={<Link href="/team" className="text-[13px] font-medium text-brand hover:underline">Team</Link>} />
            <CardBody className="space-y-3">
              {specialistLoad(d).map((l) => (
                <div key={l.specialist.id} className="flex items-center gap-3">
                  <Avatar name={l.specialist.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[13px]"><span className="truncate font-medium">{l.specialist.name}</span><span className="text-xs text-muted tnum">{l.active}/{l.specialist.capacity}</span></div>
                    <Progress value={l.utilisation} className="mt-1" tone={l.utilisation > 90 ? "danger" : l.utilisation > 70 ? "warning" : "brand"} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent activity" />
        <CardBody>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            {d.activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-3">
                <Avatar name={a.actor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-5"><span className="font-medium">{a.actor}</span> <span className="text-muted">{a.action}</span></p>
                  <p className="text-[11px] text-faint">{relativeTime(a.at)}{a.clientId ? <> · <Link href={`/clients/${a.clientId}`} className="hover:underline">{clientName(d, a.clientId)}</Link></> : null}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
