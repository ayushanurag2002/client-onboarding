"use client";
import { CheckCircle2, Circle, FileText, PenLine, Cpu, Lock } from "lucide-react";
import { cn, fmtDateTime } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { PHASES, STAGE_LABEL, STAGES } from "@/lib/constants";
import type { ChecklistItem, Stage } from "@/lib/types";

const KIND_ICON = { task: Circle, doc: FileText, signature: PenLine, system: Cpu } as const;

export function ChecklistRow({ item, locked }: { item: ChecklistItem; locked?: boolean }) {
  const toggle = useStore((s) => s.toggleChecklist);
  const Icon = item.done ? CheckCircle2 : KIND_ICON[item.kind];
  const auto = item.kind !== "task";
  return (
    <div className={cn("flex items-start gap-3 px-4 py-2.5", locked && "opacity-60")}>
      <button
        disabled={auto || locked}
        onClick={() => toast.result(toggle(item.id))}
        title={auto ? "Completes automatically" : locked ? "Earlier stage" : item.done ? "Reopen" : "Mark done"}
        className={cn("mt-0.5 shrink-0 transition-colors", item.done ? "text-success" : "text-faint", !auto && !locked && "hover:text-fg")}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", item.done ? "text-muted line-through decoration-faint" : "font-medium")}>{item.title}</p>
        {item.hint && !item.done ? <p className="text-xs text-faint">{item.hint}</p> : null}
        {item.done && item.doneAt ? <p className="text-[11px] text-faint">Completed {fmtDateTime(item.doneAt)}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {auto ? <Badge className="text-[10.5px]">auto</Badge> : null}
        {item.required ? <Badge tone={item.done ? "success" : "warning"} className="text-[10.5px]">required</Badge> : <Badge className="text-[10.5px]">optional</Badge>}
      </div>
    </div>
  );
}

export function Checklist({ clientId, currentStage, phases }: { clientId: string; currentStage: Stage; phases?: Stage[] }) {
  const all = useStore((s) => s.checklist);
  const items = all.filter((i) => i.clientId === clientId);
  const show = (phases ?? PHASES) as Stage[];
  const curIdx = STAGES.indexOf(currentStage);
  return (
    <div className="space-y-4">
      {show.map((phase) => {
        const list = items.filter((i) => i.phase === phase);
        if (!list.length) return null;
        const done = list.filter((i) => i.done).length;
        const pIdx = STAGES.indexOf(phase);
        const state = pIdx < curIdx || currentStage === "live" ? "past" : pIdx === curIdx ? "current" : "future";
        return (
          <div key={phase} className={cn("overflow-hidden rounded-xl border bg-elev shadow-card", state === "current" ? "border-brand/50" : "border-border")}>
            <div className="flex items-center justify-between border-b border-border bg-subtle/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{STAGE_LABEL[phase]}</span>
                {state === "current" ? <Badge tone="brand">current stage</Badge> : state === "future" ? <span className="inline-flex items-center gap-1 text-[11px] text-faint"><Lock className="h-3 w-3" /> upcoming</span> : null}
              </div>
              <span className="text-xs text-muted tnum">{done}/{list.length}</span>
            </div>
            <div className="divide-y divide-border">
              {list.map((i) => <ChecklistRow key={i.id} item={i} locked={state === "future"} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
