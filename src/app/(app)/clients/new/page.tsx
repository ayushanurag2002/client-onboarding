"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Building2, Users, CreditCard, ClipboardCheck } from "lucide-react";
import { useStore, type NewClientInput } from "@/lib/store";
import { PageHeader, KV } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn, fmtCurrency, isoDate, addDays } from "@/lib/utils";
import { CLIENT_TYPE_LABEL, PLAN_PRICING, CHECKLIST_TEMPLATE } from "@/lib/constants";
import type { ClientType, Plan } from "@/lib/types";

const steps = [{ label: "Firm", icon: Building2 }, { label: "Contact", icon: Users }, { label: "Plan", icon: CreditCard }, { label: "Review", icon: ClipboardCheck }];
const COUNTRIES = ["United States", "United Kingdom", "Canada", "Singapore", "Germany", "France", "Japan", "India", "Nigeria", "UAE", "Brazil", "Australia"];

export default function NewClientPage() {
  const router = useRouter();
  const specialists = useStore((s) => s.specialists);
  const createClient = useStore((s) => s.createClient);
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<NewClientInput>({ firm: "", type: "vc_firm", website: "", country: "United States", specialistId: specialists[0]?.id ?? "", source: "Inbound", expectedVehicles: 3, expectedAumUsd: 10_000_000, plan: "pro", summary: "", contactName: "", contactEmail: "", contactRole: "gp", kickoffAt: isoDate(addDays(new Date(), 2)) });
  const set = <K extends keyof NewClientInput>(k: K, v: NewClientInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = [!!form.firm.trim() && form.expectedVehicles > 0, !!form.contactName.trim() && form.contactEmail.includes("@"), true, true];
  const pricing = PLAN_PRICING[form.plan];
  const submit = () => {
    const r = createClient(form);
    if (toast.result(r)) router.push(`/clients/${r.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/clients", label: "Clients" }} title="New client intake" subtitle="Creates the client in Intake with a generated onboarding checklist, document requests and a kick-off task." />
      <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-success text-white" : i === step ? "bg-brand text-brand-fg" : "bg-subtle text-faint")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={cn("text-sm font-medium", i === step ? "text-fg" : "hidden text-faint sm:inline")}>{s.label}</span>
            {i < steps.length - 1 ? <ChevronRight className="mx-0.5 h-4 w-4 text-faint sm:mx-1" /> : null}
          </li>
        ))}
      </ol>
      <Card>
        <CardBody className="pt-5">
          {step === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Firm name" className="sm:col-span-2"><Input placeholder="e.g. Northwind Ventures" value={form.firm} onChange={(e) => set("firm", e.target.value)} /></Field>
              <Field label="Client type"><Select value={form.type} onChange={(e) => set("type", e.target.value as ClientType)}>{(Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((t) => <option key={t} value={t}>{CLIENT_TYPE_LABEL[t]}</option>)}</Select></Field>
              <Field label="Country"><Select value={form.country} onChange={(e) => set("country", e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Website"><Input placeholder="firm.com" value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
              <Field label="Lead source"><Select value={form.source} onChange={(e) => set("source", e.target.value)}>{["Inbound", "Referral", "Partner (law firm)", "Conference", "Outbound"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
              <Field label="Expected vehicles (first year)"><Input type="number" min={1} value={form.expectedVehicles} onChange={(e) => set("expectedVehicles", Number(e.target.value))} /></Field>
              <Field label="Expected AUM"><MoneyInput value={form.expectedAumUsd} onChange={(n) => set("expectedAumUsd", n)} /></Field>
              <Field label="Summary" className="sm:col-span-2"><Textarea placeholder="Strategy, timeline, anything the team should know…" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Primary contact name" className="sm:col-span-2"><Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
              <Field label="Role"><Select value={form.contactRole} onChange={(e) => set("contactRole", e.target.value as NewClientInput["contactRole"])}><option value="gp">General partner</option><option value="cfo">CFO / finance</option><option value="counsel">Counsel</option><option value="ops">Operations</option><option value="other">Other</option></Select></Field>
              <Field label="Onboarding specialist"><Select value={form.specialistId} onChange={(e) => set("specialistId", e.target.value)}>{specialists.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.title}</option>)}</Select></Field>
              <Field label="Kick-off call date"><Input type="date" value={form.kickoffAt ?? ""} onChange={(e) => set("kickoffAt", e.target.value)} /></Field>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(PLAN_PRICING) as Plan[]).map((p) => {
                  const pr = PLAN_PRICING[p];
                  return (
                    <button key={p} onClick={() => set("plan", p)} className={cn("rounded-xl border p-4 text-left transition-all", form.plan === p ? "border-brand bg-brand-soft ring-2 ring-[var(--ring)]" : "border-border hover:bg-hover")}>
                      <p className="text-sm font-semibold capitalize">{p}</p>
                      <p className="mt-1 text-xl font-semibold tnum">{fmtCurrency(pr.perVehicleFee)}<span className="text-xs font-normal text-muted"> / vehicle</span></p>
                      <p className="mt-2 text-xs text-muted">Setup {fmtCurrency(pr.setupFee)} · Annual {fmtCurrency(pr.annualFee)}</p>
                      <p className="mt-1 text-xs text-faint">{p === "starter" ? "Pay as you go, email support" : p === "pro" ? "Priority support, investor portal branding" : "Dedicated CSM, DPA, custom SLAs"}</p>
                    </button>
                  );
                })}
              </div>
              <p className="rounded-lg bg-subtle/60 p-3 text-xs text-muted">Estimated first-year revenue: <span className="font-semibold text-fg tnum">{fmtCurrency(pricing.setupFee + pricing.annualFee + pricing.perVehicleFee * form.expectedVehicles)}</span> ({form.expectedVehicles} vehicles). Plan can be changed until agreements are signed.</p>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-subtle/50 p-4"><p className="text-base font-semibold">{form.firm}</p><p className="text-sm text-muted">{CLIENT_TYPE_LABEL[form.type]} · {form.country} · {form.plan} plan</p></div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <KV label="Primary contact" value={form.contactName} />
                <KV label="Email" value={form.contactEmail} />
                <KV label="Specialist" value={specialists.find((s) => s.id === form.specialistId)?.name ?? "—"} />
                <KV label="Expected vehicles" value={form.expectedVehicles} />
                <KV label="Expected AUM" value={fmtCurrency(form.expectedAumUsd)} />
                <KV label="Kick-off" value={form.kickoffAt ?? "—"} />
              </div>
              <div className="rounded-lg border border-info/30 bg-info-soft p-3 text-[13px] text-info">On creation we generate {CHECKLIST_TEMPLATE.length} checklist items across 5 stages, request formation documents, government ID and proof of address, and create the kick-off task.</div>
            </div>
          ) : null}
        </CardBody>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => (step === 0 ? router.push("/clients") : setStep(step - 1))}><ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}</Button>
          {step < steps.length - 1 ? <Button disabled={!valid[step]} onClick={() => setStep(step + 1)}>Continue <ChevronRight className="h-4 w-4" /></Button> : <Button onClick={submit}>Create client</Button>}
        </div>
      </Card>
    </div>
  );
}
