"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Activity, Agreement, AgreementType, AppData, BankStatus, BeneficialOwner, ChecklistItem, Client, ClientDoc, Contact, DocKind, EntityStatus, Health, Note, OwnerKyc, Plan, ScreeningDecision, Stage, Task, TaskStatus, WorkspaceStatus } from "./types";
import { buildSeed } from "./seed";
import { nowIso, uid } from "./utils";
import { CHECKLIST_TEMPLATE, DOC_LABEL, PLAN_PRICING, STAGES, STAGE_LABEL } from "./constants";
import { derivedChecklistState, nextStage, prevStage, stageBlockers, clientOwners } from "./selectors";

export type Result = { ok: true; message?: string } | { ok: false; error: string; blockers?: string[] };
const ok = (message?: string): Result => ({ ok: true, message });
const fail = (error: string, blockers?: string[]): Result => ({ ok: false, error, blockers });

export interface NewClientInput {
  firm: string;
  type: Client["type"];
  website: string;
  country: string;
  specialistId: string;
  source: string;
  expectedVehicles: number;
  expectedAumUsd: number;
  plan: Plan;
  summary: string;
  contactName: string;
  contactEmail: string;
  contactRole: Contact["role"];
  kickoffAt?: string;
}

interface Store extends AppData {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  reset: () => void;
  createClient: (input: NewClientInput) => { id: string } & Result;
  updateClient: (id: string, patch: Partial<Client>) => Result;
  setHealth: (id: string, health: Health, reason?: string) => Result;
  advanceStage: (id: string) => Result;
  revertStage: (id: string) => Result;
  moveToStage: (id: string, stage: Stage) => Result;
  // contacts
  addContact: (clientId: string, c: Omit<Contact, "id" | "clientId" | "inviteStatus">) => Result;
  inviteContact: (id: string) => Result;
  acceptInvite: (id: string) => Result;
  setPrimaryContact: (id: string) => Result;
  removeContact: (id: string) => Result;
  // checklist
  toggleChecklist: (id: string) => Result;
  // docs
  requestDocument: (clientId: string, kind: DocKind, name?: string) => Result;
  setDocumentStatus: (id: string, status: ClientDoc["status"], note?: string) => Result;
  // owners
  addOwner: (clientId: string, o: Omit<BeneficialOwner, "id" | "clientId" | "kycStatus">) => Result;
  setOwnerKyc: (id: string, status: OwnerKyc) => Result;
  removeOwner: (id: string) => Result;
  // screening
  runScreening: (clientId: string) => Result;
  decideScreening: (clientId: string, decision: ScreeningDecision, note?: string) => Result;
  // agreements & pricing
  setPlan: (clientId: string, plan: Plan, overrides?: Partial<Client["pricing"]>) => Result;
  sendAgreement: (id: string) => Result;
  signAgreement: (id: string) => Result;
  addAgreement: (clientId: string, type: AgreementType) => Result;
  // setup
  setEntity: (clientId: string, patch: { entityName?: string; entityJurisdiction?: string; entityStatus?: EntityStatus }) => Result;
  setBank: (clientId: string, patch: { bankProvider?: string; bankStatus?: BankStatus }) => Result;
  setWorkspace: (clientId: string, patch: { subdomain?: string; workspaceStatus?: WorkspaceStatus }) => Result;
  // tasks & notes
  createTask: (t: Omit<Task, "id" | "createdAt" | "status">) => Result;
  setTaskStatus: (id: string, status: TaskStatus) => Result;
  deleteTask: (id: string) => Result;
  addNote: (clientId: string, body: string) => Result;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const data = () => get() as AppData;
      const log = (actor: string, action: string, clientId?: string) =>
        set((s) => ({ activity: [{ id: uid("act"), at: nowIso(), actor, action, clientId }, ...s.activity].slice(0, 400) }));

      /** Recompute system / doc / signature checklist items from underlying records. */
      const sync = (clientId: string) => {
        const d = data();
        const c = d.clients.find((x) => x.id === clientId);
        if (!c) return;
        const derived = derivedChecklistState(d, c);
        const now = nowIso();
        set((s) => ({
          checklist: s.checklist.map((i) => {
            if (i.clientId !== clientId || !(i.key in derived)) return i;
            const done = derived[i.key];
            if (done === i.done) return i;
            return { ...i, done, doneAt: done ? now : undefined };
          }),
        }));
      };

      const client = (id: string) => data().clients.find((c) => c.id === id);
      const patchClient = (id: string, patch: Partial<Client> | ((c: Client) => Partial<Client>)) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)) }));

      return {
        ...buildSeed(),
        hydrated: false,
        setHydrated: (v) => set({ hydrated: v }),
        reset: () => set({ ...buildSeed() }),

        createClient: (input) => {
          if (!input.firm.trim()) return { id: "", ok: false, error: "Firm name is required" };
          if (!input.contactName.trim() || !input.contactEmail.includes("@")) return { id: "", ok: false, error: "A primary contact with a valid email is required" };
          if (data().clients.some((c) => c.firm.toLowerCase() === input.firm.trim().toLowerCase())) return { id: "", ok: false, error: "A client with this name already exists" };
          const id = uid("cl");
          const now = nowIso();
          const c: Client = {
            id,
            firm: input.firm.trim(),
            type: input.type,
            website: input.website,
            country: input.country,
            stage: "intake",
            health: "active",
            specialistId: input.specialistId,
            source: input.source,
            expectedVehicles: input.expectedVehicles,
            expectedAumUsd: input.expectedAumUsd,
            riskRating: input.country === "United States" || input.country === "United Kingdom" || input.country === "Canada" ? "low" : "medium",
            createdAt: now,
            stageEnteredAt: now,
            kickoffAt: input.kickoffAt,
            pricing: PLAN_PRICING[input.plan],
            setup: { entityName: "", entityJurisdiction: "Delaware", entityStatus: "not_started", bankProvider: "Mercury", bankStatus: "not_started", workspaceStatus: "not_provisioned", subdomain: input.firm.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) },
            screening: { sanctions: "pending", pep: "pending", adverseMedia: "pending", decision: "pending" },
            tags: [],
            summary: input.summary,
          };
          const contact: Contact = { id: uid("ct"), clientId: id, name: input.contactName, email: input.contactEmail, role: input.contactRole, primary: true, inviteStatus: "not_invited" };
          const items: ChecklistItem[] = CHECKLIST_TEMPLATE.map((t) => ({ id: uid("ck"), clientId: id, key: t.key, phase: t.phase, title: t.title, kind: t.kind, required: t.required, done: false, hint: t.hint }));
          const docs: ClientDoc[] = (["formation", "id", "proof_of_address"] as DocKind[]).map((kind) => ({ id: uid("doc"), clientId: id, kind, name: `${DOC_LABEL[kind]} – ${c.firm}`, status: "requested", requestedAt: now }));
          const agreements: Agreement[] = [
            { id: uid("ag"), clientId: id, type: "msa", status: "draft" },
            { id: uid("ag"), clientId: id, type: "order_form", status: "draft" },
            ...(input.plan === "enterprise" ? [{ id: uid("ag"), clientId: id, type: "dpa" as const, status: "draft" as const }] : []),
          ];
          set((s) => ({ clients: [c, ...s.clients], contacts: [contact, ...s.contacts], checklist: [...s.checklist, ...items], documents: [...docs, ...s.documents], agreements: [...s.agreements, ...agreements] }));
          get().createTask({ clientId: id, title: `Kick-off call – ${c.firm}`, dueDate: (input.kickoffAt ?? nowIso()).slice(0, 10), priority: "high", assigneeId: input.specialistId });
          sync(id);
          log("You", `created client ${c.firm} from intake form`, id);
          return { id, ok: true, message: "Client created – onboarding checklist generated" };
        },

        updateClient: (id, patch) => {
          patchClient(id, patch);
          sync(id);
          return ok("Saved");
        },

        setHealth: (id, health, reason) => {
          const c = client(id);
          if (!c) return fail("Client not found");
          patchClient(id, { health });
          log("You", health === "active" ? `resumed onboarding for ${c.firm}` : `put ${c.firm} ${health.replace("_", " ")}${reason ? ` – ${reason}` : ""}`, id);
          return ok(health === "active" ? "Onboarding resumed" : `Client marked ${health.replace("_", " ")}`);
        },

        advanceStage: (id) => {
          const d = data();
          const c = d.clients.find((x) => x.id === id);
          if (!c) return fail("Client not found");
          const next = nextStage(c.stage);
          if (!next) return fail("Client is already live");
          const blockers = stageBlockers(d, c);
          if (blockers.length) return fail(`${blockers.length} requirement${blockers.length > 1 ? "s" : ""} outstanding before moving to ${STAGE_LABEL[next]}`, blockers);
          const now = nowIso();
          patchClient(id, { stage: next, stageEnteredAt: now, wentLiveAt: next === "live" ? now : c.wentLiveAt });
          if (next === "verification" && c.screening.decision === "pending" && !c.screening.runAt) get().runScreening(id);
          if (next === "agreements") get().createTask({ clientId: id, title: `Send pricing proposal – ${c.firm}`, dueDate: nowIso().slice(0, 10), priority: "medium", assigneeId: c.specialistId });
          if (next === "setup") get().createTask({ clientId: id, title: `File entity & open bank account – ${c.firm}`, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), priority: "medium", assigneeId: c.specialistId });
          if (next === "launch") get().createTask({ clientId: id, title: `Go-live review – ${c.firm}`, dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), priority: "high", assigneeId: c.specialistId });
          if (next === "live") set((s) => ({ tasks: s.tasks.map((t) => (t.clientId === id && t.status !== "done" ? { ...t, status: "done" } : t)) }));
          log("You", `moved ${c.firm} to ${STAGE_LABEL[next]}`, id);
          return ok(next === "live" ? `${c.firm} is live 🎉` : `Moved to ${STAGE_LABEL[next]}`);
        },

        revertStage: (id) => {
          const c = client(id);
          if (!c) return fail("Client not found");
          const prev = prevStage(c.stage);
          if (!prev) return fail("Already at the first stage");
          patchClient(id, { stage: prev, stageEnteredAt: nowIso(), wentLiveAt: undefined });
          log("You", `moved ${c.firm} back to ${STAGE_LABEL[prev]}`, id);
          return ok(`Moved back to ${STAGE_LABEL[prev]}`);
        },

        moveToStage: (id, stage) => {
          const c = client(id);
          if (!c) return fail("Client not found");
          if (stage === c.stage) return ok();
          const from = STAGES.indexOf(c.stage);
          const to = STAGES.indexOf(stage);
          if (to === from + 1) return get().advanceStage(id);
          if (to === from - 1) return get().revertStage(id);
          return fail(to > from ? "Stages must be completed in order – advance one stage at a time" : "You can only move back one stage at a time");
        },

        // ---------- contacts ----------
        addContact: (clientId, c) => {
          if (!c.name.trim() || !c.email.includes("@")) return fail("Name and a valid email are required");
          const contact: Contact = { id: uid("ct"), clientId, ...c, inviteStatus: "not_invited" };
          set((s) => ({ contacts: [...s.contacts.map((x) => (c.primary && x.clientId === clientId ? { ...x, primary: false } : x)), contact] }));
          sync(clientId);
          log("You", `added contact ${c.name}`, clientId);
          return ok("Contact added");
        },
        inviteContact: (id) => {
          const ct = data().contacts.find((x) => x.id === id);
          if (!ct) return fail("Not found");
          const c = client(ct.clientId)!;
          if (c.setup.workspaceStatus === "not_provisioned") return fail("Provision the platform workspace before inviting users");
          set((s) => ({ contacts: s.contacts.map((x) => (x.id === id ? { ...x, inviteStatus: "invited" } : x)) }));
          log("You", `invited ${ct.name} to the ${c.firm} workspace`, ct.clientId);
          return ok(`Invitation sent to ${ct.email}`);
        },
        acceptInvite: (id) => {
          const ct = data().contacts.find((x) => x.id === id);
          if (!ct) return fail("Not found");
          if (ct.inviteStatus !== "invited") return fail("Contact has not been invited yet");
          set((s) => ({ contacts: s.contacts.map((x) => (x.id === id ? { ...x, inviteStatus: "accepted" } : x)) }));
          sync(ct.clientId);
          log("System", `${ct.name} accepted the workspace invitation`, ct.clientId);
          return ok("Invite accepted");
        },
        setPrimaryContact: (id) => {
          const ct = data().contacts.find((x) => x.id === id);
          if (!ct) return fail("Not found");
          set((s) => ({ contacts: s.contacts.map((x) => (x.clientId === ct.clientId ? { ...x, primary: x.id === id } : x)) }));
          sync(ct.clientId);
          return ok(`${ct.name} is now the primary contact`);
        },
        removeContact: (id) => {
          const ct = data().contacts.find((x) => x.id === id);
          if (!ct) return fail("Not found");
          if (ct.primary) return fail("Assign another primary contact before removing this one");
          set((s) => ({ contacts: s.contacts.filter((x) => x.id !== id) }));
          sync(ct.clientId);
          return ok("Contact removed");
        },

        // ---------- checklist ----------
        toggleChecklist: (id) => {
          const item = data().checklist.find((x) => x.id === id);
          if (!item) return fail("Not found");
          if (item.kind !== "task") return fail("This item completes automatically from its underlying record");
          const done = !item.done;
          set((s) => ({ checklist: s.checklist.map((x) => (x.id === id ? { ...x, done, doneAt: done ? nowIso() : undefined } : x)) }));
          if (item.key === "intake.kickoff" && done) patchClient(item.clientId, (c) => ({ kickoffAt: c.kickoffAt ?? nowIso() }));
          log("You", `${done ? "completed" : "reopened"} '${item.title}' for ${clientNameOf(data(), item.clientId)}`, item.clientId);
          return ok(done ? "Item completed" : "Item reopened");
        },

        // ---------- documents ----------
        requestDocument: (clientId, kind, name) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          const doc: ClientDoc = { id: uid("doc"), clientId, kind, name: name?.trim() || `${DOC_LABEL[kind]} – ${c.firm}`, status: "requested", requestedAt: nowIso() };
          set((s) => ({ documents: [doc, ...s.documents] }));
          log("You", `requested '${doc.name}' from ${c.firm}`, clientId);
          return ok("Document requested");
        },
        setDocumentStatus: (id, status, note) => {
          const doc = data().documents.find((x) => x.id === id);
          if (!doc) return fail("Not found");
          const allowed: Record<ClientDoc["status"], ClientDoc["status"][]> = { requested: ["received"], received: ["verified", "rejected"], verified: ["rejected"], rejected: ["received"] };
          if (!allowed[doc.status].includes(status)) return fail(`Cannot move document from ${doc.status} to ${status}`);
          if (status === "rejected" && !note?.trim()) return fail("A rejection reason is required");
          set((s) => ({ documents: s.documents.map((x) => (x.id === id ? { ...x, status, receivedAt: status === "received" ? nowIso() : x.receivedAt, note: status === "rejected" ? note : undefined } : x)) }));
          sync(doc.clientId);
          log(status === "received" ? "System" : "You", `${status === "received" ? "received" : status} '${doc.name}'`, doc.clientId);
          return ok(`Document ${status}`);
        },

        // ---------- owners ----------
        addOwner: (clientId, o) => {
          if (!o.name.trim()) return fail("Name required");
          if (o.ownershipPct <= 0 || o.ownershipPct > 100) return fail("Ownership must be between 1 and 100%");
          const total = clientOwners(data(), clientId).reduce((a, x) => a + x.ownershipPct, 0);
          if (total + o.ownershipPct > 100) return fail(`Total ownership would exceed 100% (${total}% already declared)`);
          const owner: BeneficialOwner = { id: uid("bo"), clientId, ...o, kycStatus: "pending" };
          set((s) => ({ owners: [...s.owners, owner] }));
          // new owner invalidates an approved screening
          patchClient(clientId, (c) => ({ screening: c.screening.decision === "approved" ? { ...c.screening, decision: "pending", note: "Re-screen required – ownership changed" } : c.screening }));
          sync(clientId);
          log("You", `declared beneficial owner ${o.name} (${o.ownershipPct}%)`, clientId);
          return ok("Beneficial owner added");
        },
        setOwnerKyc: (id, status) => {
          const o = data().owners.find((x) => x.id === id);
          if (!o) return fail("Not found");
          set((s) => ({ owners: s.owners.map((x) => (x.id === id ? { ...x, kycStatus: status } : x)) }));
          sync(o.clientId);
          log("You", `marked KYC for ${o.name} as ${status}`, o.clientId);
          return ok(`KYC ${status}`);
        },
        removeOwner: (id) => {
          const o = data().owners.find((x) => x.id === id);
          if (!o) return fail("Not found");
          set((s) => ({ owners: s.owners.filter((x) => x.id !== id) }));
          sync(o.clientId);
          return ok("Owner removed");
        },

        // ---------- screening ----------
        runScreening: (clientId) => {
          const d = data();
          const c = d.clients.find((x) => x.id === clientId);
          if (!c) return fail("Client not found");
          const owners = clientOwners(d, clientId);
          if (!owners.length) return fail("Declare at least one beneficial owner before screening");
          const pepHit = owners.some((o) => o.pep);
          const hash = [...c.firm].reduce((a, ch) => a + ch.charCodeAt(0), 0);
          const adverse = hash % 7 === 0 ? "hit" : "clear";
          const screening: Client["screening"] = { sanctions: "clear", pep: pepHit ? "hit" : "clear", adverseMedia: adverse, runAt: nowIso(), decision: "pending", note: pepHit ? "PEP match on a declared owner" : adverse === "hit" ? "Adverse media mention found – review required" : undefined };
          patchClient(clientId, { screening });
          sync(clientId);
          log("System", `ran sanctions / PEP / adverse-media screening for ${c.firm} – ${pepHit || adverse === "hit" ? "hits found" : "all clear"}`, clientId);
          return ok(pepHit || adverse === "hit" ? "Screening complete – hits require review" : "Screening complete – all clear");
        },
        decideScreening: (clientId, decision, note) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          if (!c.screening.runAt) return fail("Run screening first");
          const hasHit = c.screening.sanctions === "hit" || c.screening.pep === "hit" || c.screening.adverseMedia === "hit";
          if (decision === "approved" && hasHit && !note?.trim()) return fail("Approving with hits requires a written rationale");
          if (decision === "approved" && c.screening.sanctions === "hit") return fail("Sanctions hits cannot be approved");
          patchClient(clientId, (x) => ({ screening: { ...x.screening, decision, decidedAt: nowIso(), decidedBy: "You", note: note?.trim() || x.screening.note }, riskRating: decision === "approved" && hasHit ? "high" : x.riskRating }));
          if (decision === "rejected") get().setHealth(clientId, "churned", "failed compliance screening");
          sync(clientId);
          log("You", `${decision} compliance screening for ${c.firm}`, clientId);
          return ok(`Screening ${decision}`);
        },

        // ---------- agreements & pricing ----------
        setPlan: (clientId, plan, overrides) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          if (STAGES.indexOf(c.stage) > STAGES.indexOf("agreements") && c.pricing.plan !== plan) return fail("Plan is locked after agreements are signed");
          const pricing = { ...PLAN_PRICING[plan], ...overrides, plan };
          patchClient(clientId, { pricing });
          set((s) => ({ agreements: plan === "enterprise" && !s.agreements.some((a) => a.clientId === clientId && a.type === "dpa") ? [...s.agreements, { id: uid("ag"), clientId, type: "dpa", status: "draft" }] : s.agreements }));
          log("You", `set ${c.firm} on the ${plan} plan`, clientId);
          return ok("Pricing updated");
        },
        addAgreement: (clientId, type) => {
          if (data().agreements.some((a) => a.clientId === clientId && a.type === type)) return fail("Agreement already exists");
          set((s) => ({ agreements: [...s.agreements, { id: uid("ag"), clientId, type, status: "draft" }] }));
          return ok("Agreement added");
        },
        sendAgreement: (id) => {
          const a = data().agreements.find((x) => x.id === id);
          if (!a) return fail("Not found");
          if (a.status !== "draft") return fail("Already sent");
          const c = client(a.clientId)!;
          if (STAGES.indexOf(c.stage) < STAGES.indexOf("agreements")) return fail("Complete verification before sending agreements");
          set((s) => ({ agreements: s.agreements.map((x) => (x.id === id ? { ...x, status: "sent", sentAt: nowIso() } : x)) }));
          set((s) => ({ checklist: s.checklist.map((x) => (x.clientId === a.clientId && x.key === "agreements.proposal" && !x.done ? { ...x, done: true, doneAt: nowIso() } : x)) }));
          log("You", `sent ${a.type.replace("_", " ")} to ${c.firm} for signature`, a.clientId);
          return ok("Sent for e-signature");
        },
        signAgreement: (id) => {
          const a = data().agreements.find((x) => x.id === id);
          if (!a) return fail("Not found");
          if (a.status !== "sent") return fail("Send the agreement before marking it signed");
          set((s) => ({ agreements: s.agreements.map((x) => (x.id === id ? { ...x, status: "signed", signedAt: nowIso() } : x)) }));
          sync(a.clientId);
          log("System", `${a.type.replace("_", " ")} signed by ${clientNameOf(data(), a.clientId)}`, a.clientId);
          return ok("Agreement signed");
        },

        // ---------- setup ----------
        setEntity: (clientId, patch) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          if (patch.entityStatus && patch.entityStatus !== "not_started" && !(patch.entityName ?? c.setup.entityName).trim()) return fail("Entity name is required before filing");
          patchClient(clientId, (x) => ({ setup: { ...x.setup, ...patch } }));
          sync(clientId);
          if (patch.entityStatus) log("You", `entity ${patch.entityStatus.replace("_", " ")} for ${c.firm}`, clientId);
          return ok("Entity updated");
        },
        setBank: (clientId, patch) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          if (patch.bankStatus && patch.bankStatus !== "not_started" && c.setup.entityStatus !== "formed") return fail("Bank account requires a formed legal entity");
          patchClient(clientId, (x) => ({ setup: { ...x.setup, ...patch } }));
          sync(clientId);
          if (patch.bankStatus) log("You", `bank account ${patch.bankStatus.replace("_", " ")} (${patch.bankProvider ?? c.setup.bankProvider}) for ${c.firm}`, clientId);
          return ok("Bank updated");
        },
        setWorkspace: (clientId, patch) => {
          const c = client(clientId);
          if (!c) return fail("Client not found");
          if (patch.subdomain !== undefined && !/^[a-z0-9-]{3,}$/.test(patch.subdomain)) return fail("Subdomain must be 3+ lowercase letters, numbers or dashes");
          patchClient(clientId, (x) => ({ setup: { ...x.setup, ...patch } }));
          sync(clientId);
          if (patch.workspaceStatus) log("You", `workspace ${patch.workspaceStatus.replace("_", " ")} for ${c.firm}`, clientId);
          return ok("Workspace updated");
        },

        // ---------- tasks & notes ----------
        createTask: (t) => {
          if (!t.title.trim()) return fail("Title required");
          set((s) => ({ tasks: [{ id: uid("t"), createdAt: nowIso(), status: "open", ...t }, ...s.tasks] }));
          return ok("Task created");
        },
        setTaskStatus: (id, status) => {
          const t = data().tasks.find((x) => x.id === id);
          if (!t) return fail("Not found");
          set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, status } : x)) }));
          if (status === "done") log("You", `completed task '${t.title}'`, t.clientId);
          return ok(status === "done" ? "Task completed" : "Task updated");
        },
        deleteTask: (id) => {
          set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
          return ok("Task deleted");
        },
        addNote: (clientId, body) => {
          if (!body.trim()) return fail("Note is empty");
          const n: Note = { id: uid("n"), clientId, at: nowIso(), author: "You", body: body.trim() };
          set((s) => ({ notes: [n, ...s.notes] }));
          log("You", `added a note on ${clientNameOf(data(), clientId)}`, clientId);
          return ok("Note added");
        },
      };
    },
    {
      name: "allocations-client-onboarding-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ specialists: s.specialists, clients: s.clients, contacts: s.contacts, checklist: s.checklist, documents: s.documents, owners: s.owners, agreements: s.agreements, tasks: s.tasks, notes: s.notes, activity: s.activity }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

function clientNameOf(d: AppData, id: string) {
  return d.clients.find((c) => c.id === id)?.firm ?? "client";
}

export type { Activity };
