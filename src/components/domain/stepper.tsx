"use client";
import { Check, Pause, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABEL } from "@/lib/constants";
import type { Health, Stage } from "@/lib/types";

export function StageStepper({ stage, health }: { stage: Stage; health: Health }) {
  const idx = STAGES.indexOf(stage);
  return (
    <ol className="flex items-center">
      {STAGES.map((s, i) => {
        const done = i < idx || stage === "live";
        const current = i === idx && stage !== "live";
        return (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors", done ? "border-success bg-success text-white" : current ? (health === "active" ? "border-brand bg-brand text-brand-fg shadow-[0_0_0_4px_var(--brand-soft)]" : health === "on_hold" ? "border-warning bg-warning text-white" : "border-danger bg-danger text-white") : "border-border bg-elev text-faint")}>
                {done ? <Check className="h-3.5 w-3.5" /> : current && health === "on_hold" ? <Pause className="h-3.5 w-3.5" /> : current && health === "churned" ? <XCircle className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("mt-1.5 text-[11px] font-medium", current ? "text-fg" : "text-faint")}>{STAGE_LABEL[s]}</span>
            </div>
            {i < STAGES.length - 1 ? <span className={cn("mx-2 mb-5 h-0.5 flex-1 rounded", i < idx || stage === "live" ? "bg-success" : "bg-border")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
