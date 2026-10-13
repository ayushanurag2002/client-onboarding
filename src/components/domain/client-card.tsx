"use client";
import Link from "next/link";
import { AlertTriangle, Pause } from "lucide-react";
import { cn, fmtCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Avatar, Progress } from "@/components/ui/misc";
import { Badge, riskTone } from "@/components/ui/badge";
import { CLIENT_TYPE_LABEL } from "@/lib/constants";
import { daysInStage, isOverSla, progressPct, slaDays, specialistName } from "@/lib/selectors";
import type { Client } from "@/lib/types";

export function ClientCard({ client, draggable, onDragStart }: { client: Client; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const d = useStore();
  const days = daysInStage(client);
  const over = isOverSla(client);
  const pct = progressPct(d, client.id);
  return (
    <Link
      href={`/clients/${client.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn("block rounded-xl border bg-elev p-3 shadow-card transition-all hover:-translate-y-px hover:shadow-pop", over ? "border-danger/40" : "border-border", client.health !== "active" && "opacity-70", draggable && "cursor-grab active:cursor-grabbing")}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{client.firm}</p>
          <p className="truncate text-[11.5px] text-muted">{CLIENT_TYPE_LABEL[client.type]} · {client.country}</p>
        </div>
        <Avatar name={specialistName(d, client.specialistId)} size="sm" />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={pct} className="flex-1" tone={pct === 100 ? "success" : "brand"} />
        <span className="text-[11px] text-faint tnum">{pct}%</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge tone={riskTone[client.riskRating]} className="px-1.5 text-[10.5px]">{client.riskRating} risk</Badge>
          <span className="text-[11px] text-faint tnum">{fmtCurrency(client.expectedAumUsd, { compact: true })}</span>
        </div>
        {client.health === "on_hold" ? <span className="inline-flex items-center gap-1 text-[11px] text-warning"><Pause className="h-3 w-3" /> on hold</span> : client.health === "churned" ? <span className="text-[11px] text-danger">churned</span> : (
          <span className={cn("inline-flex items-center gap-1 text-[11px] tnum", over ? "font-medium text-danger" : "text-faint")}>{over ? <AlertTriangle className="h-3 w-3" /> : null}{days}d / {slaDays(client)}d</span>
        )}
      </div>
    </Link>
  );
}
