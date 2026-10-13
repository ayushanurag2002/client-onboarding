"use client";
import * as React from "react";
import { useStore } from "@/lib/store";
import { PageHeader, KV } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/components/layout/theme";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CHECKLIST_TEMPLATE, STAGE_LABEL, STAGE_SLA_DAYS, STAGES } from "@/lib/constants";
import { RotateCcw, Moon, Sun, Database } from "lucide-react";

export default function SettingsPage() {
  const d = useStore();
  const { theme, toggle } = useTheme();
  const [confirm, setConfirm] = React.useState(false);
  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace preferences, onboarding template and demo data" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Appearance" /><CardBody><div className="flex items-center justify-between rounded-lg border border-border p-3"><div className="flex items-center gap-2 text-sm">{theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Theme: <span className="font-medium capitalize">{theme}</span></div><Button variant="outline" size="sm" onClick={toggle}>Switch to {theme === "dark" ? "light" : "dark"}</Button></div></CardBody></Card>
        <Card><CardHeader title="Workspace" /><CardBody className="grid grid-cols-2 gap-4"><KV label="Organisation" value="Allocations (demo)" /><KV label="You" value="Admin" /><KV label="Role" value={<Badge tone="brand">Onboarding admin</Badge>} /><KV label="Stage SLAs" value={STAGES.filter((s) => s !== "live").map((s) => `${STAGE_LABEL[s]} ${STAGE_SLA_DAYS[s]}d`).join(" · ")} /></CardBody></Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Onboarding checklist template" subtitle="Applied to every new client. Auto items complete from underlying records." />
          <CardBody>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {STAGES.filter((s) => s !== "live").map((s) => (
                <div key={s} className="rounded-lg border border-border p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">{STAGE_LABEL[s]}</p><ul className="space-y-1.5">{CHECKLIST_TEMPLATE.filter((t) => t.phase === s).map((t) => <li key={t.key} className="flex items-start justify-between gap-2 text-[12.5px]"><span>{t.title}</span>{t.kind !== "task" ? <Badge className="shrink-0 text-[10px]">auto</Badge> : t.required ? <Badge tone="warning" className="shrink-0 text-[10px]">req</Badge> : null}</li>)}</ul></div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Demo data" subtitle="Stored locally in your browser. No backend, no network calls." />
          <CardBody>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Clients", d.clients.length], ["Contacts", d.contacts.length], ["Checklist items", d.checklist.length], ["Documents", d.documents.length], ["Activity events", d.activity.length]].map(([k, v]) => <div key={k as string} className="rounded-lg border border-border p-3"><p className="text-xs text-faint">{k}</p><p className="text-lg font-semibold tnum">{v}</p></div>)}</div>
            <div className="flex items-center gap-3 rounded-lg bg-subtle/60 p-3"><Database className="h-4 w-4 text-faint" /><p className="flex-1 text-sm text-muted">Reset restores the seed dataset and discards your changes.</p><Button variant="danger" size="sm" onClick={() => setConfirm(true)}><RotateCcw className="h-3.5 w-3.5" /> Reset demo data</Button></div>
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Reset demo data?" description="All local changes will be lost." confirmLabel="Reset" danger onConfirm={() => { d.reset(); toast.success("Demo data reset"); }} />
    </>
  );
}
