"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader, KV, Tabs, Progress, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge, stageTone, healthTone, riskTone, docTone, ownerTone, screenTone, decisionTone, agreementTone, inviteTone, entityTone, bankTone, workspaceTone, planTone, priorityTone } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/input";
import { StageStepper } from "@/components/domain/stepper";
import { Checklist } from "@/components/domain/checklist";
import { AddContactDialog, AddOwnerDialog, RequestDocDialog, RejectDocDialog, ScreeningDecisionDialog, HoldDialog, AddTaskDialog, BlockerList } from "@/components/domain/dialogs";
import { fmtCurrency, fmtDate, fmtDateTime, relativeTime, daysUntil, cn, titleCase } from "@/lib/utils";
import { STAGES, STAGE_LABEL, STAGE_DESC, CLIENT_TYPE_LABEL, DOC_LABEL, PLAN_PRICING } from "@/lib/constants";
import { stageBlockers, nextStage, daysInStage, slaDays, isOverSla, progressPct, phaseProgress, specialistName, clientContacts, clientDocs, clientOwners, clientAgreements, clientTasks, clientNotes, daysToLive } from "@/lib/selectors";
import type { Plan, ScreeningDecision, EntityStatus, BankStatus, WorkspaceStatus } from "@/lib/types";
import { ArrowRight, ArrowLeft, Pause, Play, XCircle, Pencil, Plus, ShieldCheck, FileText, Inbox, CheckCircle2, Send, Building2, Landmark, Globe, Mail, UserPlus, Star, Trash2, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";

type Tab = "overview" | "checklist" | "verification" | "agreements" | "setup" | "contacts" | "activity";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const d = useStore();
  const c = d.clients.find((x) => x.id === id);
  const [tab, setTab] = React.useState<Tab>("overview");
  const [dlg, setDlg] = React.useState<null | "contact" | "owner" | "doc" | "task" | "edit" | "hold" | "churn" | "plan" | "entity" | "workspace">(null);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [decision, setDecision] = React.useState<ScreeningDecision | null>(null);
  const [note, setNote] = React.useState("");
  const [blocked, setBlocked] = React.useState<string[] | null>(null);
  if (!c) return <EmptyState title="Client not found" action={<Link href="/clients"><Button variant="outline">Back to clients</Button></Link>} />;

  const blockers = stageBlockers(d, c);
  const next = nextStage(c.stage);
  const contacts = clientContacts(d, c.id);
  const docs = clientDocs(d, c.id);
  const owners = clientOwners(d, c.id);
  const agreements = clientAgreements(d, c.id);
  const tasks = clientTasks(d, c.id).filter((t) => t.status !== "done");
  const notes = clientNotes(d, c.id);
  const activity = d.activity.filter((a) => a.clientId === c.id);
  const pct = progressPct(d, c.id);
  const over = isOverSla(c);
  const ownershipTotal = owners.reduce((a, o) => a + o.ownershipPct, 0);
  const hasHit = c.screening.pep === "hit" || c.screening.adverseMedia === "hit" || c.screening.sanctions === "hit";
  const stageIdx = STAGES.indexOf(c.stage);
  const canSign = stageIdx >= STAGES.indexOf("agreements");

  const advance = () => {
    const r = d.advanceStage(c.id);
    if (!r.ok) {
      if (r.blockers?.length) setBlocked(r.blockers);
      else toast.error(r.error);
    } else toast.success(r.message ?? "Advanced");
  };
  const phaseTab: Tab = c.stage === "verification" ? "verification" : c.stage === "agreements" ? "agreements" : c.stage === "setup" ? "setup" : "checklist";

  return (
    <>
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        eyebrow={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={c.stage} map={stageTone} label={STAGE_LABEL[c.stage]} />{c.health !== "active" ? <StatusBadge status={c.health} map={healthTone} /> : null}<Badge tone={planTone[c.pricing.plan]}>{c.pricing.plan}</Badge><StatusBadge status={c.riskRating} map={riskTone} label={`${c.riskRating} risk`} />{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
        title={c.firm}
        subtitle={<span>{CLIENT_TYPE_LABEL[c.type]} · {c.country}{c.website ? <> · <a href={`https://${c.website}`} target="_blank" rel="noreferrer" className="hover:underline">{c.website}</a></> : null} · Specialist {specialistName(d, c.specialistId)}</span>}
        actions={
          <>
            <Button variant="outline" onClick={() => setDlg("edit")}><Pencil className="h-4 w-4" /> Edit</Button>
            {c.health === "active" && c.stage !== "live" ? <Button variant="ghost" onClick={() => setDlg("hold")}><Pause className="h-4 w-4" /> Hold</Button> : null}
            {c.health !== "active" ? <Button variant="outline" onClick={() => toast.result(d.setHealth(c.id, "active"))}><Play className="h-4 w-4" /> Resume</Button> : null}
            {c.health !== "churned" && c.stage !== "live" ? <Button variant="ghost" className="text-danger" onClick={() => setDlg("churn")}><XCircle className="h-4 w-4" /> Churn</Button> : null}
            {stageIdx > 0 && c.health === "active" ? <Button variant="outline" onClick={() => toast.result(d.revertStage(c.id))}><ArrowLeft className="h-4 w-4" /> Back a stage</Button> : null}
            {next && c.health === "active" ? <Button onClick={advance} title={blockers.length ? `${blockers.length} requirement(s) outstanding` : undefined} className={blockers.length ? "opacity-70" : ""}>{next === "live" ? "Go live" : `Advance to ${STAGE_LABEL[next]}`} <ArrowRight className="h-4 w-4" /></Button> : null}
          </>
        }
      />

      <Card className="mb-6">
        <CardBody className="pt-5">
          <StageStepper stage={c.stage} health={c.health} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted">{STAGE_DESC[c.stage]}</p>
            {c.stage !== "live" ? <span className={cn("text-xs tnum", over ? "font-semibold text-danger" : "text-faint")}>{over ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> : null}{daysInStage(c)}d in stage · target {slaDays(c)}d</span> : <span className="text-xs text-success">Live since {fmtDate(c.wentLiveAt)} · {daysToLive(c)} days from intake</span>}
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="p-4"><KV label="Progress" value={`${pct}%`} /><Progress value={pct} className="mt-3" tone={pct === 100 ? "success" : "brand"} /></Card>
        <Card className="p-4"><KV label="Expected AUM" value={fmtCurrency(c.expectedAumUsd, { compact: true })} /><p className="mt-1 text-[11px] text-faint">{c.expectedVehicles} vehicles / yr</p></Card>
        <Card className="p-4"><KV label="Est. 1st-yr revenue" value={fmtCurrency(c.pricing.setupFee + c.pricing.annualFee + c.pricing.perVehicleFee * c.expectedVehicles, { compact: true })} /><p className="mt-1 text-[11px] text-faint">{c.pricing.plan} plan</p></Card>
        <Card className="p-4"><KV label="Screening" value={<StatusBadge status={c.screening.decision} map={decisionTone} />} /><p className="mt-1 text-[11px] text-faint">{c.screening.runAt ? `run ${fmtDate(c.screening.runAt)}` : "not run"}</p></Card>
        <Card className="p-4"><KV label="Documents" value={`${docs.filter((x) => x.status === "verified").length}/${docs.length}`} /><p className="mt-1 text-[11px] text-faint">verified</p></Card>
        <Card className="p-4"><KV label="Created" value={fmtDate(c.createdAt)} /><p className="mt-1 text-[11px] text-faint">{c.source}</p></Card>
      </div>

      {c.health === "active" && next && blockers.length && tab !== "overview" ? (
        <div className="mb-4"><BlockerList blockers={blockers} title={`Outstanding before ${STAGE_LABEL[next]}`} /></div>
      ) : null}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "checklist", label: "Checklist", count: d.checklist.filter((i) => i.clientId === c.id && !i.done && i.required).length }, { id: "verification", label: "Verification" }, { id: "agreements", label: "Agreements", count: agreements.filter((a) => a.status !== "signed").length }, { id: "setup", label: "Setup" }, { id: "contacts", label: "Contacts", count: contacts.length }, { id: "activity", label: "Notes & activity", count: notes.length }]} />

      <div className="mt-5">
        {tab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              {c.health === "active" && next ? <BlockerList blockers={blockers} title={`Outstanding before ${STAGE_LABEL[next]}`} /> : null}
              {c.health === "active" && next && !blockers.length ? <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success-soft px-3 py-2.5 text-[13px] text-success"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> All {STAGE_LABEL[c.stage]} requirements complete.</span><Button size="sm" variant="success" onClick={advance}>{next === "live" ? "Go live" : `Advance to ${STAGE_LABEL[next]}`}</Button></div> : null}
              {c.stage !== "live" ? <Checklist clientId={c.id} currentStage={c.stage} phases={[c.stage]} /> : <Card><CardBody className="pt-5"><p className="text-sm">🎉 {c.firm} is live. Handed off to fund administration on {fmtDate(c.wentLiveAt)}.</p></CardBody></Card>}
              <Card>
                <CardHeader title="About" />
                <CardBody>
                  <p className="text-sm leading-6 text-muted">{c.summary || "No summary yet."}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KV label="Kick-off" value={c.kickoffAt ? fmtDate(c.kickoffAt) : "Not scheduled"} />
                    <KV label="Lead source" value={c.source} />
                    <KV label="Entity" value={<StatusBadge status={c.setup.entityStatus} map={entityTone} />} />
                    <KV label="Workspace" value={c.setup.subdomain ? `${c.setup.subdomain}.allocations.com` : "—"} />
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader title="Stage progress" />
                <CardBody className="space-y-2.5">
                  {STAGES.filter((s) => s !== "live").map((s) => {
                    const p = phaseProgress(d, c.id, s);
                    const i = STAGES.indexOf(s);
                    return (
                      <div key={s} className="flex items-center gap-3 text-[13px]">
                        <span className={cn("w-24 shrink-0", i === stageIdx ? "font-semibold" : i < stageIdx ? "text-muted" : "text-faint")}>{STAGE_LABEL[s]}</span>
                        <Progress value={p.total ? (p.done / p.total) * 100 : 0} className="flex-1" tone={p.done === p.total ? "success" : i === stageIdx ? "brand" : "brand"} />
                        <span className="w-8 text-right text-xs text-faint tnum">{p.done}/{p.total}</span>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Primary contact" />
                <CardBody>
                  {contacts.filter((x) => x.primary).map((x) => (
                    <div key={x.id} className="flex items-center gap-3"><Avatar name={x.name} /><div className="min-w-0"><p className="truncate text-sm font-medium">{x.name}</p><p className="truncate text-xs text-muted">{x.email} · {x.role.toUpperCase()}</p></div><StatusBadge status={x.inviteStatus} map={inviteTone} /></div>
                  ))}
                  {!contacts.some((x) => x.primary) ? <p className="text-sm text-warning">No primary contact set.</p> : null}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Open tasks" action={<Button size="sm" variant="ghost" onClick={() => setDlg("task")}><Plus className="h-3.5 w-3.5" /> Add</Button>} />
                <CardBody className="space-y-2">
                  {tasks.length === 0 ? <p className="text-sm text-muted">Nothing outstanding.</p> : null}
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[13px]">
                      <div className="min-w-0"><p className="truncate">{t.title}</p><p className="text-[11px] text-faint">{specialistName(d, t.assigneeId)}</p></div>
                      <div className="flex shrink-0 items-center gap-2"><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge><span className={daysUntil(t.dueDate) < 0 ? "text-xs text-danger" : "text-xs text-muted"}>{fmtDate(t.dueDate)}</span><Button size="sm" variant="ghost" onClick={() => toast.result(d.setTaskStatus(t.id, "done"))}><CheckCircle2 className="h-3.5 w-3.5" /></Button></div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "checklist" ? <Checklist clientId={c.id} currentStage={c.stage} /> : null}

        {tab === "verification" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="KYB documents" subtitle="Requested → received → verified" action={<Button size="sm" variant="outline" onClick={() => setDlg("doc")}><Plus className="h-3.5 w-3.5" /> Request</Button>} />
              <CardBody className="space-y-2">
                {docs.map((x) => (
                  <div key={x.id} className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center">
                    <FileText className="hidden h-4 w-4 shrink-0 text-faint sm:block" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{x.name}</p><p className="text-xs text-muted">{DOC_LABEL[x.kind]} · requested {fmtDate(x.requestedAt)}{x.receivedAt ? ` · received ${fmtDate(x.receivedAt)}` : ""}</p>{x.note ? <p className="text-xs text-danger">{x.note}</p> : null}</div>
                    <StatusBadge status={x.status} map={docTone} />
                    <div className="flex gap-1.5">
                      {x.status === "requested" || x.status === "rejected" ? <Button size="sm" variant="outline" onClick={() => toast.result(d.setDocumentStatus(x.id, "received"))}><Inbox className="h-3.5 w-3.5" /> Received</Button> : null}
                      {x.status === "received" ? <><Button size="sm" variant="success" onClick={() => toast.result(d.setDocumentStatus(x.id, "verified"))}><CheckCircle2 className="h-3.5 w-3.5" /> Verify</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => setRejectId(x.id)}>Reject</Button></> : null}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Compliance screening" subtitle="Sanctions, PEP and adverse media" />
              <CardBody className="space-y-3">
                {(["sanctions", "pep", "adverseMedia"] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"><span>{k === "pep" ? "PEP" : k === "adverseMedia" ? "Adverse media" : "Sanctions"}</span><StatusBadge status={c.screening[k]} map={screenTone} /></div>
                ))}
                <div className="flex items-center justify-between rounded-lg bg-subtle/60 px-3 py-2 text-sm"><span>Decision</span><StatusBadge status={c.screening.decision} map={decisionTone} /></div>
                {c.screening.note ? <p className="text-xs text-muted">{c.screening.note}</p> : null}
                {c.screening.decidedAt ? <p className="text-[11px] text-faint">{c.screening.decidedBy} · {fmtDateTime(c.screening.decidedAt)}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => toast.result(d.runScreening(c.id))}><RefreshCw className="h-3.5 w-3.5" /> {c.screening.runAt ? "Re-run" : "Run screening"}</Button>
                  {c.screening.runAt && c.screening.decision !== "approved" ? <Button size="sm" variant="success" onClick={() => setDecision("approved")}><ShieldCheck className="h-3.5 w-3.5" /> Approve</Button> : null}
                  {c.screening.runAt && hasHit && c.screening.decision !== "escalated" ? <Button size="sm" variant="secondary" onClick={() => setDecision("escalated")}>Escalate</Button> : null}
                  {c.screening.runAt && c.screening.decision !== "rejected" ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDecision("rejected")}>Reject</Button> : null}
                </div>
              </CardBody>
            </Card>
            <Card className="xl:col-span-3">
              <CardHeader title="Beneficial owners" subtitle={`${ownershipTotal}% declared · owners ≥25% must be KYC-verified`} action={<Button size="sm" variant="outline" onClick={() => setDlg("owner")}><UserPlus className="h-3.5 w-3.5" /> Add owner</Button>} />
              <CardBody>
                {owners.length === 0 ? <p className="text-sm text-muted">No beneficial owners declared yet.</p> : (
                  <div className="scroll-area overflow-x-auto"><table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-faint"><tr><th className="pb-2 pr-3 text-left font-semibold">Owner</th><th className="pb-2 pr-3 text-left font-semibold">Country</th><th className="pb-2 pr-6 text-right font-semibold">Ownership</th><th className="pb-2 pr-3 text-left font-semibold">PEP</th><th className="pb-2 pr-3 text-left font-semibold">KYC</th><th className="pb-2 text-right font-semibold"></th></tr></thead>
                    <tbody>
                      {owners.map((o) => (
                        <tr key={o.id} className="border-t border-border">
                          <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><Avatar name={o.name} size="sm" />{o.name}</div></td>
                          <td className="py-2.5 pr-3 text-muted">{o.country}</td>
                          <td className="py-2.5 pr-6 text-right tnum">{o.ownershipPct}%{o.ownershipPct >= 25 ? <Badge className="ml-2 text-[10px]">significant</Badge> : null}</td>
                          <td className="py-2.5 pr-3">{o.pep ? <Badge tone="danger">PEP</Badge> : <span className="text-faint">—</span>}</td>
                          <td className="py-2.5 pr-3"><StatusBadge status={o.kycStatus} map={ownerTone} /></td>
                          <td className="py-2.5 text-right"><div className="flex justify-end gap-1">{o.kycStatus !== "verified" ? <Button size="sm" variant="outline" onClick={() => toast.result(d.setOwnerKyc(o.id, "verified"))}>Verify</Button> : null}{o.kycStatus !== "flagged" ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => toast.result(d.setOwnerKyc(o.id, "flagged"))}>Flag</Button> : null}<Button size="sm" variant="ghost" onClick={() => toast.result(d.removeOwner(o.id))}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {tab === "agreements" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader title="Plan & pricing" action={<Button size="sm" variant="ghost" onClick={() => setDlg("plan")}><Pencil className="h-3.5 w-3.5" /> Change</Button>} />
              <CardBody className="space-y-3">
                <div className="rounded-xl border border-brand/40 bg-brand-soft p-4"><p className="text-sm font-semibold capitalize">{c.pricing.plan} plan</p><p className="mt-1 text-2xl font-semibold tnum">{fmtCurrency(c.pricing.perVehicleFee)}<span className="text-xs font-normal text-muted"> / vehicle</span></p></div>
                <div className="grid grid-cols-2 gap-3"><KV label="Setup fee" value={fmtCurrency(c.pricing.setupFee)} /><KV label="Annual platform" value={fmtCurrency(c.pricing.annualFee)} /><KV label="Expected vehicles" value={c.expectedVehicles} /><KV label="Est. first year" value={fmtCurrency(c.pricing.setupFee + c.pricing.annualFee + c.pricing.perVehicleFee * c.expectedVehicles)} /></div>
                {stageIdx > STAGES.indexOf("agreements") ? <p className="text-xs text-faint">Plan locked – agreements signed.</p> : null}
              </CardBody>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Agreements" subtitle={canSign ? "Send for e-signature, then mark signed when the envelope completes" : "Available once verification is complete"} action={!agreements.some((a) => a.type === "dpa") ? <Button size="sm" variant="ghost" onClick={() => toast.result(d.addAgreement(c.id, "dpa"))}><Plus className="h-3.5 w-3.5" /> Add DPA</Button> : undefined} />
              <CardBody className="space-y-2">
                {agreements.length === 0 ? <p className="text-sm text-muted">Agreements are generated when the client reaches the Agreements stage.</p> : null}
                {agreements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-faint" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{a.type === "msa" ? "Master services agreement" : a.type === "order_form" ? "Order form" : "Data processing agreement"}</p><p className="text-xs text-muted">{a.signedAt ? `Signed ${fmtDateTime(a.signedAt)}` : a.sentAt ? `Sent ${fmtDateTime(a.sentAt)}` : "Draft"}</p></div>
                    <StatusBadge status={a.status} map={agreementTone} />
                    {a.status === "draft" ? <Button size="sm" variant="outline" disabled={!canSign} onClick={() => toast.result(d.sendAgreement(a.id))}><Send className="h-3.5 w-3.5" /> Send</Button> : null}
                    {a.status === "sent" ? <Button size="sm" variant="success" onClick={() => toast.result(d.signAgreement(a.id))}><CheckCircle2 className="h-3.5 w-3.5" /> Mark signed</Button> : null}
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {tab === "setup" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader title="Legal entity" action={<Button size="sm" variant="ghost" onClick={() => setDlg("entity")}><Pencil className="h-3.5 w-3.5" /></Button>} />
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3"><span className="rounded-lg bg-subtle p-2 text-faint"><Building2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{c.setup.entityName || "Not named yet"}</p><p className="text-xs text-muted">{c.setup.entityJurisdiction} LLC</p></div></div>
                <StatusBadge status={c.setup.entityStatus} map={entityTone} />
                <div className="flex flex-wrap gap-2">
                  {c.setup.entityStatus === "not_started" ? <Button size="sm" onClick={() => toast.result(d.setEntity(c.id, { entityStatus: "filing" }))}>File formation</Button> : null}
                  {c.setup.entityStatus === "filing" ? <Button size="sm" variant="success" onClick={() => toast.result(d.setEntity(c.id, { entityStatus: "formed" }))}>Mark formed</Button> : null}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Bank account" />
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3"><span className="rounded-lg bg-subtle p-2 text-faint"><Landmark className="h-4 w-4" /></span><div><p className="text-sm font-medium">{c.setup.bankProvider}</p><p className="text-xs text-muted">Operating account for the management entity</p></div></div>
                <StatusBadge status={c.setup.bankStatus} map={bankTone} />
                {c.setup.entityStatus !== "formed" ? <p className="text-xs text-warning">Requires a formed legal entity.</p> : null}
                <div className="flex flex-wrap gap-2">
                  {c.setup.bankStatus === "not_started" ? <Button size="sm" disabled={c.setup.entityStatus !== "formed"} onClick={() => toast.result(d.setBank(c.id, { bankStatus: "applied" }))}>Submit application</Button> : null}
                  {c.setup.bankStatus === "applied" ? <Button size="sm" variant="success" onClick={() => toast.result(d.setBank(c.id, { bankStatus: "opened" }))}>Mark opened</Button> : null}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Platform workspace" action={<Button size="sm" variant="ghost" onClick={() => setDlg("workspace")}><Pencil className="h-3.5 w-3.5" /></Button>} />
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3"><span className="rounded-lg bg-subtle p-2 text-faint"><Globe className="h-4 w-4" /></span><div><p className="text-sm font-medium">{c.setup.subdomain}.allocations.com <ExternalLink className="inline h-3 w-3 text-faint" /></p><p className="text-xs text-muted">Manager dashboard & investor portal</p></div></div>
                <StatusBadge status={c.setup.workspaceStatus} map={workspaceTone} />
                <div className="flex flex-wrap gap-2">
                  {c.setup.workspaceStatus === "not_provisioned" ? <Button size="sm" onClick={() => toast.result(d.setWorkspace(c.id, { workspaceStatus: "provisioned" }))}>Provision workspace</Button> : null}
                  {c.setup.workspaceStatus === "provisioned" ? <Button size="sm" variant="success" onClick={() => toast.result(d.setWorkspace(c.id, { workspaceStatus: "configured" }))}>Mark configured</Button> : null}
                </div>
              </CardBody>
            </Card>
            <Card className="xl:col-span-3">
              <CardHeader title="Admin users" subtitle="Invite contacts to the workspace once it is provisioned. At least one accepted invite is required before launch." />
              <CardBody className="space-y-2">
                {contacts.map((x) => (
                  <div key={x.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"><Avatar name={x.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{x.name}</p><p className="truncate text-xs text-muted">{x.email}</p></div><StatusBadge status={x.inviteStatus} map={inviteTone} />{x.inviteStatus === "not_invited" ? <Button size="sm" variant="outline" disabled={c.setup.workspaceStatus === "not_provisioned"} onClick={() => toast.result(d.inviteContact(x.id))}><Mail className="h-3.5 w-3.5" /> Invite</Button> : null}{x.inviteStatus === "invited" ? <Button size="sm" variant="ghost" onClick={() => toast.result(d.acceptInvite(x.id))}>Simulate accept</Button> : null}</div>
                ))}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {tab === "contacts" ? (
          <Card>
            <CardHeader title="Contacts" action={<Button size="sm" variant="outline" onClick={() => setDlg("contact")}><UserPlus className="h-3.5 w-3.5" /> Add contact</Button>} />
            <CardBody className="space-y-2">
              {contacts.map((x) => (
                <div key={x.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  <Avatar name={x.name} />
                  <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-sm font-medium">{x.name}{x.primary ? <Star className="h-3.5 w-3.5 fill-warning text-warning" /> : null}</p><p className="truncate text-xs text-muted">{x.email} · {titleCase(x.role === "gp" ? "General partner" : x.role === "cfo" ? "CFO" : x.role)}</p></div>
                  <StatusBadge status={x.inviteStatus} map={inviteTone} />
                  {!x.primary ? <Button size="sm" variant="ghost" onClick={() => toast.result(d.setPrimaryContact(x.id))}>Make primary</Button> : null}
                  {!x.primary ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => toast.result(d.removeContact(x.id))}><Trash2 className="h-3.5 w-3.5" /></Button> : null}
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}

        {tab === "activity" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Notes" />
              <CardBody>
                <div className="mb-4 flex gap-2">
                  <Textarea placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
                  <Button onClick={() => { if (toast.result(d.addNote(c.id, note))) setNote(""); }}>Post</Button>
                </div>
                <div className="space-y-3">
                  {notes.length === 0 ? <p className="text-sm text-muted">No notes yet.</p> : null}
                  {notes.map((n) => (
                    <div key={n.id} className="flex gap-3 rounded-lg border border-border p-3"><Avatar name={n.author} size="sm" /><div className="min-w-0 flex-1"><p className="text-[13px]"><span className="font-medium">{n.author}</span> <span className="text-faint">· {relativeTime(n.at)}</span></p><p className="mt-1 text-sm leading-6 text-muted">{n.body}</p></div></div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Activity" />
              <CardBody>
                {activity.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : null}
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {activity.map((a) => (<li key={a.id} className="relative"><span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-elev bg-brand" /><p className="text-[13px]"><span className="font-medium">{a.actor}</span> <span className="text-muted">{a.action}</span></p><p className="text-[11px] text-faint">{relativeTime(a.at)}</p></li>))}
                </ol>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </div>

      {blocked && next ? (
        <Dialog open onClose={() => setBlocked(null)} title={`Can't advance to ${STAGE_LABEL[next]} yet`} description={`${blocked.length} required item${blocked.length > 1 ? "s" : ""} still open in ${STAGE_LABEL[c.stage]}.`} size="sm" footer={<><Button variant="ghost" onClick={() => setBlocked(null)}>Close</Button><Button onClick={() => { setTab(phaseTab); setBlocked(null); }}>Go to {phaseTab === "checklist" ? "checklist" : STAGE_LABEL[c.stage]}</Button></>}>
          <ul className="space-y-2">
            {blocked.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{b.replace(/^[A-Za-z]+: /, "")}</li>)}
          </ul>
        </Dialog>
      ) : null}
      <AddContactDialog open={dlg === "contact"} onClose={() => setDlg(null)} clientId={c.id} />
      <AddOwnerDialog open={dlg === "owner"} onClose={() => setDlg(null)} clientId={c.id} />
      <RequestDocDialog open={dlg === "doc"} onClose={() => setDlg(null)} clientId={c.id} />
      <AddTaskDialog open={dlg === "task"} onClose={() => setDlg(null)} clientId={c.id} />
      <HoldDialog open={dlg === "hold"} onClose={() => setDlg(null)} clientId={c.id} mode="on_hold" />
      <HoldDialog open={dlg === "churn"} onClose={() => setDlg(null)} clientId={c.id} mode="churned" />
      <RejectDocDialog open={!!rejectId} onClose={() => setRejectId(null)} onConfirm={(reason) => rejectId && toast.result(d.setDocumentStatus(rejectId, "rejected", reason))} />
      {decision ? <ScreeningDecisionDialog open onClose={() => setDecision(null)} clientId={c.id} decision={decision} /> : null}
      {dlg === "edit" ? <EditClientDialog clientId={c.id} onClose={() => setDlg(null)} /> : null}
      {dlg === "plan" ? <PlanDialog clientId={c.id} onClose={() => setDlg(null)} /> : null}
      {dlg === "entity" ? <EntityDialog clientId={c.id} onClose={() => setDlg(null)} /> : null}
      {dlg === "workspace" ? <WorkspaceDialog clientId={c.id} onClose={() => setDlg(null)} /> : null}
    </>
  );
}

function EditClientDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const d = useStore();
  const c = d.clients.find((x) => x.id === clientId)!;
  const [form, setForm] = React.useState({ firm: c.firm, website: c.website, country: c.country, specialistId: c.specialistId, expectedVehicles: c.expectedVehicles, expectedAumUsd: c.expectedAumUsd, summary: c.summary, tags: c.tags.join(", "), riskRating: c.riskRating });
  return (
    <Dialog open onClose={onClose} title="Edit client" size="lg" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(d.updateClient(c.id, { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }))) onClose(); }}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Firm" className="sm:col-span-2"><Input value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} /></Field>
        <Field label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <Field label="Specialist"><Select value={form.specialistId} onChange={(e) => setForm({ ...form, specialistId: e.target.value })}>{d.specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Risk rating"><Select value={form.riskRating} onChange={(e) => setForm({ ...form, riskRating: e.target.value as typeof form.riskRating })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
        <Field label="Expected vehicles"><Input type="number" min={1} value={form.expectedVehicles} onChange={(e) => setForm({ ...form, expectedVehicles: Number(e.target.value) })} /></Field>
        <Field label="Expected AUM"><MoneyInput value={form.expectedAumUsd} onChange={(n) => setForm({ ...form, expectedAumUsd: n })} /></Field>
        <Field label="Tags (comma separated)" className="sm:col-span-2"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
        <Field label="Summary" className="sm:col-span-2"><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}

function PlanDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const d = useStore();
  const c = d.clients.find((x) => x.id === clientId)!;
  const [plan, setPlan] = React.useState<Plan>(c.pricing.plan);
  const [pricing, setPricing] = React.useState({ setupFee: c.pricing.setupFee, perVehicleFee: c.pricing.perVehicleFee, annualFee: c.pricing.annualFee });
  const pick = (p: Plan) => { setPlan(p); setPricing({ setupFee: PLAN_PRICING[p].setupFee, perVehicleFee: PLAN_PRICING[p].perVehicleFee, annualFee: PLAN_PRICING[p].annualFee }); };
  return (
    <Dialog open onClose={onClose} title="Plan & pricing" description="Negotiated overrides are allowed until agreements are signed." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(d.setPlan(c.id, plan, pricing))) onClose(); }}>Save pricing</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">{(Object.keys(PLAN_PRICING) as Plan[]).map((p) => <button key={p} onClick={() => pick(p)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium capitalize", plan === p ? "border-brand bg-brand-soft text-brand" : "border-border hover:bg-hover")}>{p}</button>)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Setup fee"><MoneyInput value={pricing.setupFee} onChange={(n) => setPricing({ ...pricing, setupFee: n })} /></Field>
          <Field label="Per vehicle"><MoneyInput value={pricing.perVehicleFee} onChange={(n) => setPricing({ ...pricing, perVehicleFee: n })} /></Field>
          <Field label="Annual"><MoneyInput value={pricing.annualFee} onChange={(n) => setPricing({ ...pricing, annualFee: n })} /></Field>
        </div>
      </div>
    </Dialog>
  );
}

function EntityDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const d = useStore();
  const c = d.clients.find((x) => x.id === clientId)!;
  const [form, setForm] = React.useState({ entityName: c.setup.entityName, entityJurisdiction: c.setup.entityJurisdiction, entityStatus: c.setup.entityStatus as EntityStatus });
  return (
    <Dialog open onClose={onClose} title="Legal entity" size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(d.setEntity(c.id, form))) onClose(); }}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Entity name"><Input value={form.entityName} onChange={(e) => setForm({ ...form, entityName: e.target.value })} placeholder={`${c.firm} Management LLC`} /></Field>
        <Field label="Jurisdiction"><Select value={form.entityJurisdiction} onChange={(e) => setForm({ ...form, entityJurisdiction: e.target.value })}>{["Delaware", "Wyoming", "Cayman Islands", "BVI"].map((j) => <option key={j}>{j}</option>)}</Select></Field>
        <Field label="Status"><Select value={form.entityStatus} onChange={(e) => setForm({ ...form, entityStatus: e.target.value as EntityStatus })}><option value="not_started">Not started</option><option value="filing">Filing</option><option value="formed">Formed</option></Select></Field>
      </div>
    </Dialog>
  );
}

function WorkspaceDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const d = useStore();
  const c = d.clients.find((x) => x.id === clientId)!;
  const [form, setForm] = React.useState({ subdomain: c.setup.subdomain, workspaceStatus: c.setup.workspaceStatus as WorkspaceStatus, bankProvider: c.setup.bankProvider, bankStatus: c.setup.bankStatus as BankStatus });
  return (
    <Dialog open onClose={onClose} title="Workspace & bank" size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { const r1 = d.setWorkspace(c.id, { subdomain: form.subdomain, workspaceStatus: form.workspaceStatus }); if (!r1.ok) return toast.error(r1.error); const r2 = d.setBank(c.id, { bankProvider: form.bankProvider, bankStatus: form.bankStatus }); if (toast.result(r2)) onClose(); }}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Subdomain" hint=".allocations.com"><Input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} /></Field>
        <Field label="Workspace status"><Select value={form.workspaceStatus} onChange={(e) => setForm({ ...form, workspaceStatus: e.target.value as WorkspaceStatus })}><option value="not_provisioned">Not provisioned</option><option value="provisioned">Provisioned</option><option value="configured">Configured</option></Select></Field>
        <Field label="Bank provider"><Select value={form.bankProvider} onChange={(e) => setForm({ ...form, bankProvider: e.target.value })}>{["Mercury", "Brex", "JPMorgan", "SVB"].map((b) => <option key={b}>{b}</option>)}</Select></Field>
        <Field label="Bank status"><Select value={form.bankStatus} onChange={(e) => setForm({ ...form, bankStatus: e.target.value as BankStatus })}><option value="not_started">Not started</option><option value="applied">Applied</option><option value="opened">Opened</option></Select></Field>
      </div>
    </Dialog>
  );
}
