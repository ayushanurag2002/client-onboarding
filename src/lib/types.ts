export type ClientType = "vc_firm" | "syndicate_lead" | "family_office" | "angel" | "emerging_manager" | "corporate";
export type Plan = "starter" | "pro" | "enterprise";
export type Stage = "intake" | "verification" | "agreements" | "setup" | "launch" | "live";
export type Health = "active" | "on_hold" | "churned";
export type RiskRating = "low" | "medium" | "high";

export interface Pricing {
  plan: Plan;
  setupFee: number;
  perVehicleFee: number;
  annualFee: number;
}

export type EntityStatus = "not_started" | "filing" | "formed";
export type BankStatus = "not_started" | "applied" | "opened";
export type WorkspaceStatus = "not_provisioned" | "provisioned" | "configured";

export interface Setup {
  entityName: string;
  entityJurisdiction: string;
  entityStatus: EntityStatus;
  bankProvider: string;
  bankStatus: BankStatus;
  workspaceStatus: WorkspaceStatus;
  subdomain: string;
}

export type ScreenResult = "pending" | "clear" | "hit";
export type ScreeningDecision = "pending" | "approved" | "escalated" | "rejected";

export interface Screening {
  sanctions: ScreenResult;
  pep: ScreenResult;
  adverseMedia: ScreenResult;
  runAt?: string;
  decision: ScreeningDecision;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
}

export interface Client {
  id: string;
  firm: string;
  type: ClientType;
  website: string;
  country: string;
  stage: Stage;
  health: Health;
  specialistId: string;
  source: string;
  expectedVehicles: number;
  expectedAumUsd: number;
  riskRating: RiskRating;
  createdAt: string;
  stageEnteredAt: string;
  kickoffAt?: string;
  wentLiveAt?: string;
  pricing: Pricing;
  setup: Setup;
  screening: Screening;
  tags: string[];
  summary: string;
}

export type ContactRole = "gp" | "cfo" | "counsel" | "ops" | "other";
export type InviteStatus = "not_invited" | "invited" | "accepted";

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  role: ContactRole;
  primary: boolean;
  inviteStatus: InviteStatus;
}

export type ChecklistKind = "task" | "doc" | "signature" | "system";

export interface ChecklistItem {
  id: string;
  clientId: string;
  key: string;
  phase: Exclude<Stage, "live">;
  title: string;
  kind: ChecklistKind;
  required: boolean;
  done: boolean;
  doneAt?: string;
  hint?: string;
}

export type DocKind = "formation" | "id" | "proof_of_address" | "w9" | "ownership_chart" | "bank_letter" | "other";
export type DocStatus = "requested" | "received" | "verified" | "rejected";

export interface ClientDoc {
  id: string;
  clientId: string;
  name: string;
  kind: DocKind;
  status: DocStatus;
  requestedAt: string;
  receivedAt?: string;
  note?: string;
}

export type OwnerKyc = "pending" | "verified" | "flagged";

export interface BeneficialOwner {
  id: string;
  clientId: string;
  name: string;
  ownershipPct: number;
  kycStatus: OwnerKyc;
  pep: boolean;
  country: string;
}

export type AgreementType = "msa" | "order_form" | "dpa";
export type AgreementStatus = "draft" | "sent" | "signed";

export interface Agreement {
  id: string;
  clientId: string;
  type: AgreementType;
  status: AgreementStatus;
  sentAt?: string;
  signedAt?: string;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "in_progress" | "done";

export interface Task {
  id: string;
  clientId?: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string;
  createdAt: string;
}

export interface Specialist {
  id: string;
  name: string;
  email: string;
  title: string;
  capacity: number;
}

export interface Note {
  id: string;
  clientId: string;
  at: string;
  author: string;
  body: string;
}

export interface Activity {
  id: string;
  clientId?: string;
  at: string;
  actor: string;
  action: string;
}

export interface AppData {
  specialists: Specialist[];
  clients: Client[];
  contacts: Contact[];
  checklist: ChecklistItem[];
  documents: ClientDoc[];
  owners: BeneficialOwner[];
  agreements: Agreement[];
  tasks: Task[];
  notes: Note[];
  activity: Activity[];
}
