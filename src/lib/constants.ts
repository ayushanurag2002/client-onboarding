import type { Stage, ChecklistKind, ClientType, Plan, Pricing, DocKind } from "./types";

export const STAGES: Stage[] = ["intake", "verification", "agreements", "setup", "launch", "live"];
export const PHASES = STAGES.filter((s) => s !== "live") as Exclude<Stage, "live">[];

export const STAGE_LABEL: Record<Stage, string> = {
  intake: "Intake",
  verification: "Verification",
  agreements: "Agreements",
  setup: "Setup",
  launch: "Launch",
  live: "Live",
};

export const STAGE_DESC: Record<Stage, string> = {
  intake: "Kick-off call, intake form and primary contact.",
  verification: "KYB documents, beneficial owners and compliance screening.",
  agreements: "Pricing proposal, MSA and order form signatures.",
  setup: "Entity formation, bank account and platform workspace.",
  launch: "First vehicle, walkthrough and go-live review.",
  live: "Client is live and handed off to fund administration.",
};

/** Target days per stage – used for SLA / aging. */
export const STAGE_SLA_DAYS: Record<Stage, number> = {
  intake: 3,
  verification: 7,
  agreements: 5,
  setup: 7,
  launch: 5,
  live: 0,
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  vc_firm: "VC firm",
  syndicate_lead: "Syndicate lead",
  family_office: "Family office",
  angel: "Angel investor",
  emerging_manager: "Emerging manager",
  corporate: "Corporate VC",
};

export const PLAN_PRICING: Record<Plan, Pricing> = {
  starter: { plan: "starter", setupFee: 0, perVehicleFee: 8_000, annualFee: 0 },
  pro: { plan: "pro", setupFee: 2_500, perVehicleFee: 6_500, annualFee: 12_000 },
  enterprise: { plan: "enterprise", setupFee: 10_000, perVehicleFee: 5_000, annualFee: 60_000 },
};

export const DOC_LABEL: Record<DocKind, string> = {
  formation: "Formation documents",
  id: "Government ID",
  proof_of_address: "Proof of address",
  w9: "W-9 / W-8",
  ownership_chart: "Ownership chart",
  bank_letter: "Bank reference letter",
  other: "Other",
};

export interface ChecklistTemplateItem {
  key: string;
  phase: Exclude<Stage, "live">;
  title: string;
  kind: ChecklistKind;
  required: boolean;
  hint?: string;
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  { key: "intake.kickoff", phase: "intake", title: "Kick-off call completed", kind: "task", required: true, hint: "30-min discovery call with the GP" },
  { key: "intake.form", phase: "intake", title: "Intake form completed", kind: "system", required: true, hint: "Auto-completes when firm profile is filled" },
  { key: "intake.contact", phase: "intake", title: "Primary contact added", kind: "system", required: true },
  { key: "intake.vehicles", phase: "intake", title: "Expected vehicles & timeline captured", kind: "task", required: false },
  { key: "verification.formation", phase: "verification", title: "Formation documents verified", kind: "doc", required: true },
  { key: "verification.id", phase: "verification", title: "Government ID verified", kind: "doc", required: true },
  { key: "verification.address", phase: "verification", title: "Proof of address verified", kind: "doc", required: true },
  { key: "verification.owners", phase: "verification", title: "Beneficial owners (≥25%) verified", kind: "system", required: true },
  { key: "verification.screening", phase: "verification", title: "Sanctions / PEP / adverse media screening approved", kind: "system", required: true },
  { key: "verification.signoff", phase: "verification", title: "Compliance sign-off", kind: "task", required: true },
  { key: "agreements.proposal", phase: "agreements", title: "Pricing proposal sent", kind: "task", required: true },
  { key: "agreements.msa", phase: "agreements", title: "Master services agreement signed", kind: "signature", required: true },
  { key: "agreements.order", phase: "agreements", title: "Order form signed", kind: "signature", required: true },
  { key: "agreements.w9", phase: "agreements", title: "W-9 / W-8 collected", kind: "doc", required: false },
  { key: "setup.entity", phase: "setup", title: "Legal entity formed", kind: "system", required: true },
  { key: "setup.bank", phase: "setup", title: "Bank account opened", kind: "system", required: true },
  { key: "setup.workspace", phase: "setup", title: "Platform workspace provisioned", kind: "system", required: true },
  { key: "setup.users", phase: "setup", title: "Admin users invited", kind: "system", required: true, hint: "At least one contact accepted their invite" },
  { key: "setup.branding", phase: "setup", title: "Branding & investor portal configured", kind: "task", required: false },
  { key: "launch.vehicle", phase: "launch", title: "First vehicle created on platform", kind: "task", required: true },
  { key: "launch.walkthrough", phase: "launch", title: "Investor-portal walkthrough delivered", kind: "task", required: false },
  { key: "launch.review", phase: "launch", title: "Go-live checklist reviewed with client", kind: "task", required: true },
];
