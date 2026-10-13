import type { Activity, Agreement, AppData, BeneficialOwner, ChecklistItem, Client, ClientDoc, Contact, Note, Specialist, Stage, Task } from "./types";
import { CHECKLIST_TEMPLATE, PLAN_PRICING, STAGES } from "./constants";
import { addDays, isoDate } from "./utils";
import { derivedChecklistState } from "./selectors";

const D = (offsetDays: number) => isoDate(addDays(new Date(), offsetDays));
const T = (offsetDays: number, hour = 10) => {
  const d = addDays(new Date(), offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const specialists: Specialist[] = [
  { id: "sp_1", name: "Maya Thompson", email: "maya@allocations.com", title: "Onboarding lead", capacity: 8 },
  { id: "sp_2", name: "Leo Fernandes", email: "leo@allocations.com", title: "Onboarding specialist", capacity: 6 },
  { id: "sp_3", name: "Aisha Rahman", email: "aisha@allocations.com", title: "Compliance analyst", capacity: 10 },
  { id: "sp_4", name: "Noah Kim", email: "noah@allocations.com", title: "Onboarding specialist", capacity: 6 },
];

type ClientSeed = {
  id: string; firm: string; type: Client["type"]; website: string; country: string; stage: Stage; health?: Client["health"]; specialistId: string; source: string;
  expectedVehicles: number; expectedAumUsd: number; riskRating: Client["riskRating"]; createdDaysAgo: number; stageDaysAgo: number; plan: Client["pricing"]["plan"];
  entity: Client["setup"]["entityStatus"]; bank: Client["setup"]["bankStatus"]; workspace: Client["setup"]["workspaceStatus"]; subdomain: string; entityName: string;
  screening: Client["screening"]; tags: string[]; summary: string; kickoffDays?: number; liveDays?: number;
};

const clear = (days: number, by = "Aisha Rahman"): Client["screening"] => ({ sanctions: "clear", pep: "clear", adverseMedia: "clear", runAt: T(-days), decision: "approved", decidedAt: T(-days + 1), decidedBy: by });
const pendingScreen: Client["screening"] = { sanctions: "pending", pep: "pending", adverseMedia: "pending", decision: "pending" };

const clientSeeds: ClientSeed[] = [
  { id: "cl_1", firm: "Northwind Ventures", type: "vc_firm", website: "northwind.vc", country: "United States", stage: "live", specialistId: "sp_1", source: "Referral", expectedVehicles: 6, expectedAumUsd: 40_000_000, riskRating: "low", createdDaysAgo: 120, stageDaysAgo: 80, plan: "enterprise", entity: "formed", bank: "opened", workspace: "configured", subdomain: "northwind", entityName: "Northwind Ventures Management LLC", screening: clear(110), tags: ["priority", "multi-SPV"], summary: "Seed-stage firm moving 6 SPVs/year from a legacy admin. Enterprise plan with dedicated support.", kickoffDays: -118, liveDays: -80 },
  { id: "cl_2", firm: "Lumen Syndicate", type: "syndicate_lead", website: "lumen.xyz", country: "United States", stage: "launch", specialistId: "sp_2", source: "Inbound", expectedVehicles: 10, expectedAumUsd: 12_000_000, riskRating: "low", createdDaysAgo: 34, stageDaysAgo: 3, plan: "pro", entity: "formed", bank: "opened", workspace: "configured", subdomain: "lumen", entityName: "Lumen Syndicate GP LLC", screening: clear(28), tags: ["syndicate"], summary: "Active AngelList syndicate lead migrating to Allocations. Needs investor-portal walkthrough before first deal.", kickoffDays: -33 },
  { id: "cl_3", firm: "Harbor Angels", type: "angel", website: "harborangels.co", country: "United States", stage: "setup", specialistId: "sp_4", source: "Partner (law firm)", expectedVehicles: 4, expectedAumUsd: 5_000_000, riskRating: "low", createdDaysAgo: 26, stageDaysAgo: 9, plan: "pro", entity: "formed", bank: "applied", workspace: "provisioned", subdomain: "harbor", entityName: "Harbor Angels Management LLC", screening: clear(20), tags: [], summary: "Angel group formalising into an SPV program. Bank application pending at Mercury.", kickoffDays: -25 },
  { id: "cl_4", firm: "Okafor Capital", type: "emerging_manager", website: "okaforcap.com", country: "Nigeria", stage: "verification", specialistId: "sp_1", source: "Conference", expectedVehicles: 2, expectedAumUsd: 40_000_000, riskRating: "medium", createdDaysAgo: 18, stageDaysAgo: 10, plan: "enterprise", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "okafor", entityName: "", screening: { sanctions: "clear", pep: "hit", adverseMedia: "clear", runAt: T(-6), decision: "escalated", decidedAt: T(-5), decidedBy: "Aisha Rahman", note: "PEP match on a beneficial owner – enhanced due diligence requested." }, tags: ["EDD", "cross-border"], summary: "First-time fund manager raising a $40M growth fund. One beneficial owner flagged as PEP – enhanced due diligence in progress.", kickoffDays: -17 },
  { id: "cl_5", firm: "Cedar Ridge Family Office", type: "family_office", website: "cedarridgefo.com", country: "United States", stage: "agreements", specialistId: "sp_2", source: "Referral", expectedVehicles: 3, expectedAumUsd: 25_000_000, riskRating: "low", createdDaysAgo: 21, stageDaysAgo: 6, plan: "pro", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "cedarridge", entityName: "", screening: clear(12), tags: ["family-office"], summary: "Single-family office co-investing alongside VC funds. Reviewing MSA with outside counsel.", kickoffDays: -20 },
  { id: "cl_6", firm: "Helio Climate Partners", type: "vc_firm", website: "helioclimate.com", country: "United Kingdom", stage: "verification", specialistId: "sp_4", source: "Inbound", expectedVehicles: 3, expectedAumUsd: 15_000_000, riskRating: "low", createdDaysAgo: 9, stageDaysAgo: 5, plan: "pro", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "helio", entityName: "", screening: { sanctions: "clear", pep: "clear", adverseMedia: "clear", runAt: T(-2), decision: "pending" }, tags: ["UK"], summary: "UK climate fund running US SPVs for American LPs. Awaiting proof of address and compliance sign-off.", kickoffDays: -8 },
  { id: "cl_7", firm: "Quill Growth", type: "corporate", website: "quillgrowth.io", country: "United States", stage: "intake", specialistId: "sp_2", source: "Outbound", expectedVehicles: 1, expectedAumUsd: 8_000_000, riskRating: "low", createdDaysAgo: 2, stageDaysAgo: 2, plan: "starter", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "quill", entityName: "", screening: pendingScreen, tags: [], summary: "Corporate venture arm exploring a single co-invest SPV. Kick-off call scheduled." },
  { id: "cl_8", firm: "Sato Ventures", type: "vc_firm", website: "sato.vc", country: "Japan", stage: "intake", specialistId: "sp_4", source: "Referral", expectedVehicles: 2, expectedAumUsd: 20_000_000, riskRating: "medium", createdDaysAgo: 6, stageDaysAgo: 6, plan: "pro", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "sato", entityName: "", screening: pendingScreen, tags: ["cross-border", "SLA"], summary: "Japanese VC setting up Delaware feeder vehicles. Intake stalled – no primary contact confirmed yet." },
  { id: "cl_9", firm: "Driftwood Capital", type: "family_office", website: "driftwoodcap.com", country: "Canada", stage: "setup", specialistId: "sp_1", source: "Inbound", expectedVehicles: 5, expectedAumUsd: 30_000_000, riskRating: "low", createdDaysAgo: 40, stageDaysAgo: 12, plan: "enterprise", entity: "filing", bank: "not_started", workspace: "provisioned", subdomain: "driftwood", entityName: "Driftwood SPV Management LLC", screening: clear(30), tags: ["SLA"], summary: "Multi-family office. Entity filing delayed at the Delaware registrar – chasing registered agent.", kickoffDays: -39 },
  { id: "cl_10", firm: "Greenlight Angels", type: "angel", website: "greenlight.vc", country: "United States", stage: "live", specialistId: "sp_2", source: "Inbound", expectedVehicles: 8, expectedAumUsd: 10_000_000, riskRating: "low", createdDaysAgo: 75, stageDaysAgo: 45, plan: "pro", entity: "formed", bank: "opened", workspace: "configured", subdomain: "greenlight", entityName: "Greenlight Angels GP LLC", screening: clear(68), tags: [], summary: "Angel network, now running 3 SPVs on platform.", kickoffDays: -74, liveDays: -45 },
  { id: "cl_11", firm: "Pinecrest Capital", type: "emerging_manager", website: "pinecrest.capital", country: "United States", stage: "agreements", health: "on_hold", specialistId: "sp_4", source: "Conference", expectedVehicles: 1, expectedAumUsd: 10_000_000, riskRating: "low", createdDaysAgo: 50, stageDaysAgo: 30, plan: "starter", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "pinecrest", entityName: "", screening: clear(40), tags: ["on-hold"], summary: "Paused – GP waiting on anchor LP commitment before signing.", kickoffDays: -49 },
  { id: "cl_12", firm: "Halvorsen Holdings", type: "family_office", website: "halvorsen.no", country: "Norway", stage: "intake", health: "churned", specialistId: "sp_1", source: "Outbound", expectedVehicles: 1, expectedAumUsd: 5_000_000, riskRating: "low", createdDaysAgo: 60, stageDaysAgo: 55, plan: "starter", entity: "not_started", bank: "not_started", workspace: "not_provisioned", subdomain: "halvorsen", entityName: "", screening: pendingScreen, tags: [], summary: "Chose to stay with existing provider. Closed-lost." },
];

const clients: Client[] = clientSeeds.map((c) => ({
  id: c.id,
  firm: c.firm,
  type: c.type,
  website: c.website,
  country: c.country,
  stage: c.stage,
  health: c.health ?? "active",
  specialistId: c.specialistId,
  source: c.source,
  expectedVehicles: c.expectedVehicles,
  expectedAumUsd: c.expectedAumUsd,
  riskRating: c.riskRating,
  createdAt: T(-c.createdDaysAgo),
  stageEnteredAt: T(-c.stageDaysAgo),
  kickoffAt: c.kickoffDays !== undefined ? T(c.kickoffDays, 15) : undefined,
  wentLiveAt: c.liveDays !== undefined ? T(c.liveDays) : undefined,
  pricing: PLAN_PRICING[c.plan],
  setup: { entityName: c.entityName, entityJurisdiction: "Delaware", entityStatus: c.entity, bankProvider: "Mercury", bankStatus: c.bank, workspaceStatus: c.workspace, subdomain: c.subdomain },
  screening: c.screening,
  tags: c.tags,
  summary: c.summary,
}));

const contactSeeds: Array<[string, string, string, Contact["role"], boolean, Contact["inviteStatus"]]> = [
  ["cl_1", "Priya Raman", "priya@northwind.vc", "gp", true, "accepted"],
  ["cl_1", "Dev Patel", "dev@northwind.vc", "cfo", false, "accepted"],
  ["cl_2", "Elena Marchetti", "elena@lumen.xyz", "gp", true, "accepted"],
  ["cl_3", "Marcus Chen", "marcus@harborangels.co", "gp", true, "accepted"],
  ["cl_3", "Rina Shah", "rina@harborangels.co", "ops", false, "invited"],
  ["cl_4", "Daniel Okafor", "dan@okaforcap.com", "gp", true, "not_invited"],
  ["cl_4", "Chidi Eze", "chidi@okaforcap.com", "cfo", false, "not_invited"],
  ["cl_5", "Grace Whitfield", "grace@cedarridgefo.com", "cfo", true, "not_invited"],
  ["cl_5", "Tom Alder", "tom@alderlaw.com", "counsel", false, "not_invited"],
  ["cl_6", "Oliver Hart", "oliver@helioclimate.com", "gp", true, "not_invited"],
  ["cl_7", "Samantha Lee", "sam.lee@quillgrowth.io", "ops", true, "not_invited"],
  ["cl_9", "Jules Martin", "jules@driftwoodcap.com", "gp", true, "accepted"],
  ["cl_9", "Ana Costa", "ana@driftwoodcap.com", "ops", false, "invited"],
  ["cl_10", "Wyatt Thompson", "wyatt@greenlight.vc", "gp", true, "accepted"],
  ["cl_11", "Hannah O'Brien", "hannah@pinecrest.capital", "gp", true, "not_invited"],
  ["cl_12", "Erik Halvorsen", "erik@halvorsen.no", "gp", true, "not_invited"],
];
const contacts: Contact[] = contactSeeds.map(([clientId, name, email, role, primary, inviteStatus], i) => ({ id: `ct_${i + 1}`, clientId, name, email, role, primary, inviteStatus }));

/** Which checklist keys are done per client (by stage progress). */
function checklistFor(c: Client): ChecklistItem[] {
  const stageIdx = STAGES.indexOf(c.stage);
  const doneOverrides: Record<string, Partial<Record<string, boolean>>> = {
    cl_2: { "launch.vehicle": true },
    cl_3: { "setup.branding": true },
    cl_4: { "verification.signoff": false },
    cl_5: { "agreements.proposal": true, "agreements.msa": false },
    cl_6: { "verification.signoff": false },
    cl_7: { "intake.kickoff": false },
    cl_8: { "intake.kickoff": true, "intake.vehicles": true },
    cl_9: { "setup.users": true },
  };
  return CHECKLIST_TEMPLATE.map((t, i) => {
    const phaseIdx = STAGES.indexOf(t.phase);
    let done = phaseIdx < stageIdx; // earlier phases completed
    const ov = doneOverrides[c.id]?.[t.key];
    if (ov !== undefined) done = ov;
    if (c.id === "cl_4" && t.key === "verification.screening") done = false;
    if (c.id === "cl_6" && t.key === "verification.address") done = false;
    if (c.id === "cl_6" && t.key === "verification.screening") done = false;
    if (c.id === "cl_8" && t.key === "intake.contact") done = false;
    if (c.id === "cl_8" && t.key === "intake.form") done = true;
    if (c.id === "cl_7" && t.key === "intake.form") done = true;
    if (c.id === "cl_7" && t.key === "intake.contact") done = true;
    if (c.id === "cl_9" && t.key === "setup.entity") done = false;
    if (c.id === "cl_9" && t.key === "setup.bank") done = false;
    if (c.id === "cl_3" && t.key === "setup.bank") done = false;
    if (c.id === "cl_3" && t.key === "setup.users") done = true;
    return { id: `ck_${c.id}_${i}`, clientId: c.id, key: t.key, phase: t.phase, title: t.title, kind: t.kind, required: t.required, done, doneAt: done ? c.stageEnteredAt : undefined, hint: t.hint };
  });
}
const checklist = clients.flatMap(checklistFor);

function docsFor(c: Client): ClientDoc[] {
  const stageIdx = STAGES.indexOf(c.stage);
  const past = stageIdx > 1;
  const base: Array<[ClientDoc["kind"], string, ClientDoc["status"]]> = [
    ["formation", `Certificate of formation – ${c.firm}.pdf`, past ? "verified" : c.id === "cl_4" || c.id === "cl_6" ? "verified" : "requested"],
    ["id", `Passport – GP.pdf`, past ? "verified" : c.id === "cl_4" ? "verified" : c.id === "cl_6" ? "received" : "requested"],
    ["proof_of_address", `Utility bill – registered office.pdf`, past ? "verified" : c.id === "cl_4" ? "rejected" : "requested"],
  ];
  if (stageIdx >= 2) base.push(["w9", `W-9 – ${c.firm}.pdf`, stageIdx > 2 ? "verified" : "received"]);
  if (stageIdx >= 3) base.push(["bank_letter", `Bank reference – Mercury.pdf`, "verified"]);
  if (c.id === "cl_4") base.push(["ownership_chart", "Ownership chart – Okafor Capital.pdf", "received"]);
  return base.map(([kind, name, status], i) => ({ id: `doc_${c.id}_${i}`, clientId: c.id, name, kind, status, requestedAt: c.createdAt, receivedAt: status === "requested" ? undefined : c.stageEnteredAt, note: status === "rejected" ? "Document older than 90 days – please resend a recent statement." : undefined }));
}
const documents = clients.flatMap(docsFor);

const ownerSeeds: Array<[string, string, number, BeneficialOwner["kycStatus"], boolean, string]> = [
  ["cl_1", "Priya Raman", 60, "verified", false, "United States"],
  ["cl_1", "Sanjay Raman", 40, "verified", false, "United States"],
  ["cl_2", "Elena Marchetti", 100, "verified", false, "United States"],
  ["cl_3", "Marcus Chen", 50, "verified", false, "United States"],
  ["cl_3", "Lisa Chen", 50, "verified", false, "United States"],
  ["cl_4", "Daniel Okafor", 70, "verified", false, "Nigeria"],
  ["cl_4", "Senator Adaeze Okafor", 30, "flagged", true, "Nigeria"],
  ["cl_5", "Whitfield Family Trust", 100, "verified", false, "United States"],
  ["cl_6", "Oliver Hart", 55, "verified", false, "United Kingdom"],
  ["cl_6", "Helio Holdings Ltd", 45, "pending", false, "United Kingdom"],
  ["cl_9", "Jules Martin", 100, "verified", false, "Canada"],
  ["cl_10", "Wyatt Thompson", 100, "verified", false, "United States"],
  ["cl_11", "Hannah O'Brien", 100, "verified", false, "United States"],
];
const owners: BeneficialOwner[] = ownerSeeds.map(([clientId, name, ownershipPct, kycStatus, pep, country], i) => ({ id: `bo_${i + 1}`, clientId, name, ownershipPct, kycStatus, pep, country }));

function agreementsFor(c: Client): Agreement[] {
  const stageIdx = STAGES.indexOf(c.stage);
  if (stageIdx < 2) return [];
  const signed = stageIdx > 2;
  const list: Agreement[] = [
    { id: `ag_${c.id}_msa`, clientId: c.id, type: "msa", status: signed ? "signed" : c.id === "cl_5" ? "sent" : "draft", sentAt: signed || c.id === "cl_5" ? c.stageEnteredAt : undefined, signedAt: signed ? c.stageEnteredAt : undefined },
    { id: `ag_${c.id}_order`, clientId: c.id, type: "order_form", status: signed ? "signed" : "draft", sentAt: signed ? c.stageEnteredAt : undefined, signedAt: signed ? c.stageEnteredAt : undefined },
  ];
  if (c.pricing.plan === "enterprise") list.push({ id: `ag_${c.id}_dpa`, clientId: c.id, type: "dpa", status: signed ? "signed" : "draft", signedAt: signed ? c.stageEnteredAt : undefined });
  return list;
}
const agreements = clients.flatMap(agreementsFor);

const tasks: Task[] = [
  { id: "t_1", clientId: "cl_7", title: "Kick-off call – Quill Growth", dueDate: D(1), priority: "high", status: "open", assigneeId: "sp_2", createdAt: T(-2) },
  { id: "t_2", clientId: "cl_8", title: "Confirm primary contact – Sato Ventures", dueDate: D(-2), priority: "high", status: "open", assigneeId: "sp_4", createdAt: T(-5) },
  { id: "t_3", clientId: "cl_4", title: "Enhanced due diligence memo – PEP owner", dueDate: D(2), priority: "high", status: "in_progress", assigneeId: "sp_3", createdAt: T(-5) },
  { id: "t_4", clientId: "cl_6", title: "Chase proof of address – Helio", dueDate: D(0), priority: "medium", status: "open", assigneeId: "sp_4", createdAt: T(-2) },
  { id: "t_5", clientId: "cl_5", title: "Follow up with outside counsel on MSA redlines", dueDate: D(1), priority: "medium", status: "open", assigneeId: "sp_2", createdAt: T(-3) },
  { id: "t_6", clientId: "cl_9", title: "Call Delaware registered agent re: filing delay", dueDate: D(-1), priority: "high", status: "open", assigneeId: "sp_1", createdAt: T(-4) },
  { id: "t_7", clientId: "cl_3", title: "Check Mercury application status", dueDate: D(3), priority: "medium", status: "open", assigneeId: "sp_4", createdAt: T(-1) },
  { id: "t_8", clientId: "cl_2", title: "Investor-portal walkthrough – Lumen", dueDate: D(2), priority: "medium", status: "open", assigneeId: "sp_2", createdAt: T(-1) },
  { id: "t_9", clientId: "cl_2", title: "Go-live review – Lumen Syndicate", dueDate: D(4), priority: "high", status: "open", assigneeId: "sp_2", createdAt: T(-1) },
  { id: "t_10", title: "Update onboarding checklist template (W-8 variant)", dueDate: D(10), priority: "low", status: "open", assigneeId: "sp_1", createdAt: T(-7) },
  { id: "t_11", clientId: "cl_1", title: "90-day check-in – Northwind", dueDate: D(-20), priority: "low", status: "done", assigneeId: "sp_1", createdAt: T(-30) },
];

const notes: Note[] = [
  { id: "n_1", clientId: "cl_4", at: T(-5, 16), author: "Aisha Rahman", body: "PEP hit on Adaeze Okafor (30% owner, sitting senator). Escalated to compliance committee; requested source-of-wealth letter and ownership chart." },
  { id: "n_2", clientId: "cl_4", at: T(-3, 11), author: "Maya Thompson", body: "Dan is responsive and understands the EDD ask. Target decision by end of week." },
  { id: "n_3", clientId: "cl_5", at: T(-4, 14), author: "Leo Fernandes", body: "Counsel (Tom Alder) sent MSA redlines on liability cap. Legal reviewing – expect turnaround in 2 days." },
  { id: "n_4", clientId: "cl_9", at: T(-2, 9), author: "Maya Thompson", body: "Registered agent confirms backlog at Delaware Division of Corporations. Expedited filing requested ($100 fee approved)." },
  { id: "n_5", clientId: "cl_8", at: T(-1, 10), author: "Noah Kim", body: "Emailed Sato twice; no reply. Will try the intro partner for a warm nudge." },
  { id: "n_6", clientId: "cl_2", at: T(-1, 15), author: "Leo Fernandes", body: "First vehicle (Lumen SPV – Helio Energy) created on platform. Walkthrough booked for Thursday." },
];

const activity: Activity[] = [
  { id: "a_1", clientId: "cl_2", at: T(-0.1, 9), actor: "Leo Fernandes", action: "completed 'First vehicle created on platform' for Lumen Syndicate" },
  { id: "a_2", clientId: "cl_6", at: T(-0.4, 15), actor: "System", action: "received 'Passport – GP.pdf' from Helio Climate Partners" },
  { id: "a_3", clientId: "cl_3", at: T(-1, 11), actor: "Noah Kim", action: "marked bank account as applied (Mercury) for Harbor Angels" },
  { id: "a_4", clientId: "cl_9", at: T(-2, 9), actor: "Maya Thompson", action: "added a note on Driftwood Capital" },
  { id: "a_5", clientId: "cl_4", at: T(-5, 16), actor: "Aisha Rahman", action: "escalated screening for Okafor Capital (PEP match)" },
  { id: "a_6", clientId: "cl_7", at: T(-2, 10), actor: "Leo Fernandes", action: "created client Quill Growth from intake form" },
  { id: "a_7", clientId: "cl_2", at: T(-3, 12), actor: "Leo Fernandes", action: "moved Lumen Syndicate to Launch" },
  { id: "a_8", clientId: "cl_5", at: T(-6, 10), actor: "Leo Fernandes", action: "sent MSA to Cedar Ridge Family Office for signature" },
  { id: "a_9", clientId: "cl_8", at: T(-6, 9), actor: "Noah Kim", action: "created client Sato Ventures from intake form" },
];

export function buildSeed(): AppData {
  const base: AppData = { specialists, clients, contacts, checklist: [], documents, owners, agreements, tasks, notes, activity };
  // Items backed by real records are marked done when the record already satisfies them.
  const derived = Object.fromEntries(clients.map((c) => [c.id, derivedChecklistState(base, c)]));
  base.checklist = checklist.map((i) => (!i.done && derived[i.clientId]?.[i.key] ? { ...i, done: true, doneAt: i.doneAt ?? T(-1) } : i));
  return base;
}
