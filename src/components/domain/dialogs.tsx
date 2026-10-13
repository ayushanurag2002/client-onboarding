"use client";
import * as React from "react";
import { useStore } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { isoDate, addDays } from "@/lib/utils";
import { DOC_LABEL } from "@/lib/constants";
import type { ContactRole, DocKind, ScreeningDecision, TaskPriority } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

const gate = <P extends { open: boolean }>(Inner: React.ComponentType<P>) => {
  const Gated = (props: P) => (props.open ? <Inner {...props} /> : null);
  Gated.displayName = `Gated(${Inner.displayName ?? Inner.name})`;
  return Gated;
};

export const AddContactDialog = gate(function AddContactDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const add = useStore((s) => s.addContact);
  const [form, setForm] = React.useState({ name: "", email: "", role: "gp" as ContactRole, primary: false });
  return (
    <Dialog open={open} onClose={onClose} title="Add contact" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(add(clientId, form))) onClose(); }}>Add contact</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ContactRole })}><option value="gp">General partner</option><option value="cfo">CFO / finance</option><option value="counsel">Counsel</option><option value="ops">Operations</option><option value="other">Other</option></Select></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.checked })} className="accent-[var(--brand)]" /> Make primary contact</label>
      </div>
    </Dialog>
  );
});

export const AddOwnerDialog = gate(function AddOwnerDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const add = useStore((s) => s.addOwner);
  const [form, setForm] = React.useState({ name: "", ownershipPct: 25, pep: false, country: "United States" });
  return (
    <Dialog open={open} onClose={onClose} title="Declare beneficial owner" description="Anyone owning ≥25% must complete KYC before verification can pass." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(add(clientId, form))) onClose(); }}>Add owner</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Ownership %"><Input type="number" min={1} max={100} value={form.ownershipPct} onChange={(e) => setForm({ ...form, ownershipPct: Number(e.target.value) })} /></Field>
        <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.pep} onChange={(e) => setForm({ ...form, pep: e.target.checked })} className="accent-[var(--brand)]" /> Politically exposed person (self-declared)</label>
      </div>
    </Dialog>
  );
});

export const RequestDocDialog = gate(function RequestDocDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const request = useStore((s) => s.requestDocument);
  const [kind, setKind] = React.useState<DocKind>("ownership_chart");
  const [name, setName] = React.useState("");
  return (
    <Dialog open={open} onClose={onClose} title="Request document" size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(request(clientId, kind, name))) onClose(); }}>Send request</Button></>}>
      <div className="space-y-4">
        <Field label="Type"><Select value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>{(Object.keys(DOC_LABEL) as DocKind[]).map((k) => <option key={k} value={k}>{DOC_LABEL[k]}</option>)}</Select></Field>
        <Field label="Name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank for default" /></Field>
      </div>
    </Dialog>
  );
});

export const RejectDocDialog = gate(function RejectDocDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = React.useState("");
  return (
    <Dialog open={open} onClose={onClose} title="Reject document" size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { onConfirm(reason); onClose(); }}>Reject & re-request</Button></>}>
      <Field label="Reason sent to client"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Document is older than 90 days" /></Field>
    </Dialog>
  );
});

export const ScreeningDecisionDialog = gate(function ScreeningDecisionDialog({ open, onClose, clientId, decision }: { open: boolean; onClose: () => void; clientId: string; decision: ScreeningDecision }) {
  const decide = useStore((s) => s.decideScreening);
  const c = useStore((s) => s.clients.find((x) => x.id === clientId));
  const [note, setNote] = React.useState("");
  const hasHit = c && (c.screening.pep === "hit" || c.screening.adverseMedia === "hit" || c.screening.sanctions === "hit");
  const labels: Record<ScreeningDecision, string> = { approved: "Approve screening", escalated: "Escalate for enhanced due diligence", rejected: "Reject client", pending: "" };
  return (
    <Dialog open={open} onClose={onClose} title={labels[decision]} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={decision === "rejected" ? "danger" : decision === "escalated" ? "secondary" : "success"} onClick={() => { if (toast.result(decide(clientId, decision, note))) onClose(); }}>{labels[decision]}</Button></>}>
      {decision === "approved" && hasHit ? <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Screening has hits. Approving requires a written rationale and will set the client&apos;s risk rating to high.</p> : null}
      {decision === "rejected" ? <p className="mb-3 text-xs text-danger">Rejecting marks the client as churned.</p> : null}
      <Field label="Rationale / note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Dialog>
  );
});

export const HoldDialog = gate(function HoldDialog({ open, onClose, clientId, mode }: { open: boolean; onClose: () => void; clientId: string; mode: "on_hold" | "churned" }) {
  const setHealth = useStore((s) => s.setHealth);
  const [reason, setReason] = React.useState("");
  return (
    <Dialog open={open} onClose={onClose} title={mode === "on_hold" ? "Put onboarding on hold" : "Mark client as churned"} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={mode === "churned" ? "danger" : "primary"} onClick={() => { if (toast.result(setHealth(clientId, mode, reason))) onClose(); }}>Confirm</Button></>}>
      <Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === "on_hold" ? "e.g. Waiting on anchor LP" : "e.g. Chose another provider"} /></Field>
    </Dialog>
  );
});

export const AddTaskDialog = gate(function AddTaskDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId?: string }) {
  const d = useStore();
  const [form, setForm] = React.useState({ title: "", clientId: clientId ?? "", dueDate: isoDate(addDays(new Date(), 3)), priority: "medium" as TaskPriority, assigneeId: d.specialists[0]?.id ?? "" });
  return (
    <Dialog open={open} onClose={onClose} title="New task" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (toast.result(d.createTask({ title: form.title, clientId: form.clientId || undefined, dueDate: form.dueDate, priority: form.priority, assigneeId: form.assigneeId }))) onClose(); }}>Create task</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Client"><Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">— General —</option>{d.clients.map((c) => <option key={c.id} value={c.id}>{c.firm}</option>)}</Select></Field>
        <Field label="Assignee"><Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>{d.specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
      </div>
    </Dialog>
  );
});

export function BlockerList({ blockers, title = "Outstanding before next stage" }: { blockers: string[]; title?: string }) {
  if (!blockers.length) return null;
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-warning">{title}</p>
      <ul className="space-y-0.5 text-[13px] text-warning">
        {blockers.map((b) => <li key={b} className="flex gap-2"><span>•</span><span>{b}</span></li>)}
      </ul>
    </div>
  );
}
