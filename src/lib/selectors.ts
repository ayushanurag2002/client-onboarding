import type { AppData, Client, Stage } from "./types";
import { STAGES, STAGE_SLA_DAYS, STAGE_LABEL } from "./constants";

export const nextStage = (s: Stage): Stage | null => {
  const i = STAGES.indexOf(s);
  return i < STAGES.length - 1 ? STAGES[i + 1] : null;
};
export const prevStage = (s: Stage): Stage | null => {
  const i = STAGES.indexOf(s);
  return i > 0 ? STAGES[i - 1] : null;
};

export const daysInStage = (c: Client) => Math.floor((Date.now() - new Date(c.stageEnteredAt).getTime()) / 86400000);
export const slaDays = (c: Client) => STAGE_SLA_DAYS[c.stage];
export const isOverSla = (c: Client) => c.stage !== "live" && c.health === "active" && daysInStage(c) > slaDays(c);
export const daysToLive = (c: Client) => (c.wentLiveAt ? Math.round((new Date(c.wentLiveAt).getTime() - new Date(c.createdAt).getTime()) / 86400000) : null);

export const clientChecklist = (d: AppData, clientId: string) => d.checklist.filter((i) => i.clientId === clientId);
export const clientContacts = (d: AppData, clientId: string) => d.contacts.filter((i) => i.clientId === clientId);
export const clientDocs = (d: AppData, clientId: string) => d.documents.filter((i) => i.clientId === clientId);
export const clientOwners = (d: AppData, clientId: string) => d.owners.filter((i) => i.clientId === clientId);
export const clientAgreements = (d: AppData, clientId: string) => d.agreements.filter((i) => i.clientId === clientId);
export const clientTasks = (d: AppData, clientId: string) => d.tasks.filter((i) => i.clientId === clientId);
export const clientNotes = (d: AppData, clientId: string) => d.notes.filter((i) => i.clientId === clientId);

export const specialistName = (d: AppData, id: string) => d.specialists.find((s) => s.id === id)?.name ?? "Unassigned";
export const clientName = (d: AppData, id?: string) => (id ? d.clients.find((c) => c.id === id)?.firm ?? "Unknown" : "General");

/** Overall onboarding progress 0–100 based on required checklist items. */
export function progressPct(d: AppData, clientId: string) {
  const items = clientChecklist(d, clientId).filter((i) => i.required);
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export function phaseProgress(d: AppData, clientId: string, phase: Stage) {
  const items = clientChecklist(d, clientId).filter((i) => i.phase === phase);
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, requiredOpen: items.filter((i) => i.required && !i.done) };
}

/** Human-readable blockers preventing the client from advancing to the next stage. */
export function stageBlockers(d: AppData, c: Client): string[] {
  const blockers: string[] = [];
  if (c.health !== "active") blockers.push(`Client is ${c.health.replace("_", " ")} – resume before advancing`);
  if (c.stage === "live") return ["Client is already live"];
  const open = clientChecklist(d, c.id).filter((i) => i.phase === c.stage && i.required && !i.done);
  for (const i of open) blockers.push(`${STAGE_LABEL[c.stage]}: ${i.title}`);
  return blockers;
}

/** Derived completion for system/doc/signature checklist items, computed from the underlying records. */
export function derivedChecklistState(d: AppData, c: Client): Record<string, boolean> {
  const docs = clientDocs(d, c.id);
  const owners = clientOwners(d, c.id);
  const contacts = clientContacts(d, c.id);
  const agreements = clientAgreements(d, c.id);
  const docVerified = (kind: string) => docs.some((x) => x.kind === kind && x.status === "verified");
  const significant = owners.filter((o) => o.ownershipPct >= 25);
  return {
    "intake.form": !!(c.firm && c.type && c.country && c.expectedVehicles > 0),
    "intake.contact": contacts.some((x) => x.primary),
    "verification.formation": docVerified("formation"),
    "verification.id": docVerified("id"),
    "verification.address": docVerified("proof_of_address"),
    "verification.owners": owners.length > 0 && significant.every((o) => o.kycStatus === "verified") && owners.reduce((a, o) => a + o.ownershipPct, 0) >= 75,
    "verification.screening": c.screening.decision === "approved",
    "agreements.msa": agreements.some((a) => a.type === "msa" && a.status === "signed"),
    "agreements.order": agreements.some((a) => a.type === "order_form" && a.status === "signed"),
    "agreements.w9": docVerified("w9"),
    "setup.entity": c.setup.entityStatus === "formed",
    "setup.bank": c.setup.bankStatus === "opened",
    "setup.workspace": c.setup.workspaceStatus !== "not_provisioned",
    "setup.users": contacts.some((x) => x.inviteStatus === "accepted"),
  };
}

export function stageCounts(d: AppData) {
  return STAGES.map((s) => ({ stage: s, label: STAGE_LABEL[s], count: d.clients.filter((c) => c.stage === s && c.health === "active").length }));
}

export function specialistLoad(d: AppData) {
  return d.specialists.map((s) => {
    const active = d.clients.filter((c) => c.specialistId === s.id && c.health === "active" && c.stage !== "live");
    return { specialist: s, active: active.length, overSla: active.filter(isOverSla).length, openTasks: d.tasks.filter((t) => t.assigneeId === s.id && t.status !== "done").length, utilisation: Math.round((active.length / s.capacity) * 100) };
  });
}

export function avgDaysToLive(d: AppData) {
  const vals = d.clients.map(daysToLive).filter((x): x is number => x !== null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}
