"use client";
import * as React from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader, SegmentedControl, EmptyState, Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge, StatusBadge, taskTone, priorityTone } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { AddTaskDialog } from "@/components/domain/dialogs";
import { fmtDate, daysUntil, cn } from "@/lib/utils";
import { clientName, specialistName } from "@/lib/selectors";
import { Plus, CheckSquare, Circle, CircleDot, CheckCircle2, Trash2, Calendar } from "lucide-react";
import type { Task } from "@/lib/types";

export default function TasksPage() {
  const d = useStore();
  const [filter, setFilter] = React.useState<"open" | "overdue" | "done">("open");
  const [assignee, setAssignee] = React.useState("all");
  const [add, setAdd] = React.useState(false);
  const rows = d.tasks.filter((t) => (assignee === "all" || t.assigneeId === assignee) && (filter === "open" ? t.status !== "done" : filter === "overdue" ? t.status !== "done" && daysUntil(t.dueDate) < 0 : t.status === "done")).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const groups: { label: string; items: Task[] }[] = [
    { label: "Overdue", items: rows.filter((t) => t.status !== "done" && daysUntil(t.dueDate) < 0) },
    { label: "Today", items: rows.filter((t) => t.status !== "done" && daysUntil(t.dueDate) === 0) },
    { label: "This week", items: rows.filter((t) => t.status !== "done" && daysUntil(t.dueDate) > 0 && daysUntil(t.dueDate) <= 7) },
    { label: "Later", items: rows.filter((t) => t.status !== "done" && daysUntil(t.dueDate) > 7) },
    { label: "Completed", items: rows.filter((t) => t.status === "done") },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHeader title="Tasks" subtitle={`${d.tasks.filter((t) => t.status !== "done").length} open · ${d.tasks.filter((t) => t.status !== "done" && daysUntil(t.dueDate) < 0).length} overdue`} actions={<><SegmentedControl options={[{ value: "open", label: "Open" }, { value: "overdue", label: "Overdue" }, { value: "done", label: "Done" }]} value={filter} onChange={setFilter} /><Button onClick={() => setAdd(true)}><Plus className="h-4 w-4" /> New task</Button></>} />
      <div className="mb-4 w-full sm:w-64"><Select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="all">All assignees</option>{d.specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
      {groups.length === 0 ? <EmptyState icon={<CheckSquare className="h-5 w-5" />} title="Nothing here" description="You're all caught up." /> : null}
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", g.label === "Overdue" ? "text-danger" : "text-faint")}>{g.label} · {g.items.length}</p>
            <div className="overflow-hidden rounded-xl border border-border bg-elev shadow-card">
              {g.items.map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <button onClick={() => toast.result(d.setTaskStatus(t.id, t.status === "done" ? "open" : t.status === "open" ? "in_progress" : "done"))} className={cn("shrink-0", t.status === "done" ? "text-success" : t.status === "in_progress" ? "text-info" : "text-faint hover:text-fg")} title={t.status === "open" ? "Start" : t.status === "in_progress" ? "Complete" : "Reopen"}>
                    {t.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : t.status === "in_progress" ? <CircleDot className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", t.status === "done" && "text-faint line-through")}>{t.title}</p>
                    <p className="truncate text-xs text-muted">{t.clientId ? <Link href={`/clients/${t.clientId}`} className="hover:underline">{clientName(d, t.clientId)}</Link> : "General"}</p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex"><Avatar name={specialistName(d, t.assigneeId)} size="sm" /><span className="text-xs text-muted">{specialistName(d, t.assigneeId).split(" ")[0]}</span></div>
                  <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                  <StatusBadge status={t.status} map={taskTone} />
                  <span className={cn("hidden w-24 items-center gap-1 text-xs sm:flex", daysUntil(t.dueDate) < 0 && t.status !== "done" ? "text-danger" : "text-muted")}><Calendar className="h-3.5 w-3.5" /> {fmtDate(t.dueDate)}</span>
                  {t.status !== "done" ? <Button size="sm" variant="outline" onClick={() => toast.result(d.setTaskStatus(t.id, "done"))}>Complete</Button> : null}
                  <button onClick={() => toast.result(d.deleteTask(t.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <AddTaskDialog open={add} onClose={() => setAdd(false)} />
    </>
  );
}
