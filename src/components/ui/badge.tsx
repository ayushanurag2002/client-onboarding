import { cn } from "@/lib/utils";
import type { Stage, Health, RiskRating, DocStatus, OwnerKyc, ScreenResult, ScreeningDecision, AgreementStatus, InviteStatus, TaskStatus, TaskPriority, EntityStatus, BankStatus, WorkspaceStatus, Plan } from "@/lib/types";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "violet" | "teal";

const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-muted border-border",
  brand: "bg-brand-soft text-brand border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  violet: "bg-brand-soft text-violet border-transparent",
  teal: "bg-info-soft text-teal border-transparent",
};

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-medium leading-5 whitespace-nowrap", tones[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export const stageTone: Record<Stage, Tone> = { intake: "neutral", verification: "warning", agreements: "info", setup: "violet", launch: "teal", live: "success" };
export const healthTone: Record<Health, Tone> = { active: "success", on_hold: "warning", churned: "danger" };
export const riskTone: Record<RiskRating, Tone> = { low: "success", medium: "warning", high: "danger" };
export const docTone: Record<DocStatus, Tone> = { requested: "neutral", received: "info", verified: "success", rejected: "danger" };
export const ownerTone: Record<OwnerKyc, Tone> = { pending: "warning", verified: "success", flagged: "danger" };
export const screenTone: Record<ScreenResult, Tone> = { pending: "neutral", clear: "success", hit: "danger" };
export const decisionTone: Record<ScreeningDecision, Tone> = { pending: "warning", approved: "success", escalated: "danger", rejected: "danger" };
export const agreementTone: Record<AgreementStatus, Tone> = { draft: "neutral", sent: "info", signed: "success" };
export const inviteTone: Record<InviteStatus, Tone> = { not_invited: "neutral", invited: "info", accepted: "success" };
export const taskTone: Record<TaskStatus, Tone> = { open: "neutral", in_progress: "info", done: "success" };
export const priorityTone: Record<TaskPriority, Tone> = { low: "neutral", medium: "warning", high: "danger" };
export const entityTone: Record<EntityStatus, Tone> = { not_started: "neutral", filing: "warning", formed: "success" };
export const bankTone: Record<BankStatus, Tone> = { not_started: "neutral", applied: "warning", opened: "success" };
export const workspaceTone: Record<WorkspaceStatus, Tone> = { not_provisioned: "neutral", provisioned: "info", configured: "success" };
export const planTone: Record<Plan, Tone> = { starter: "neutral", pro: "brand", enterprise: "violet" };

export function StatusBadge<T extends string>({ status, map, label }: { status: T; map: Record<T, Tone>; label?: string }) {
  return (
    <Badge tone={map[status]} dot>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
