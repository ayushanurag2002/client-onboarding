"use client";
import * as React from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/table";
import { StatusBadge, docTone } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { RejectDocDialog } from "@/components/domain/dialogs";
import { fmtDateTime, fmtDate } from "@/lib/utils";
import { DOC_LABEL } from "@/lib/constants";
import { clientName } from "@/lib/selectors";
import type { ClientDoc, DocKind } from "@/lib/types";
import { FileText, Search, Inbox, CheckCircle2 } from "lucide-react";

export default function DocumentsPage() {
  const d = useStore();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const rows = d.documents.filter((x) => (status === "all" || x.status === status) && (!q || x.name.toLowerCase().includes(q.toLowerCase()) || clientName(d, x.clientId).toLowerCase().includes(q.toLowerCase())));
  const columns: Column<ClientDoc>[] = [
    { key: "name", header: "Document", sortValue: (x) => x.name, render: (x) => <div className="flex items-center gap-3"><span className="rounded-lg bg-subtle p-2 text-faint"><FileText className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-medium">{x.name}</p><p className="text-xs text-muted">{DOC_LABEL[x.kind as DocKind]}{x.note ? ` · ${x.note}` : ""}</p></div></div> },
    { key: "client", header: "Client", sortValue: (x) => clientName(d, x.clientId), render: (x) => <Link href={`/clients/${x.clientId}`} className="text-muted hover:underline">{clientName(d, x.clientId)}</Link> },
    { key: "status", header: "Status", sortValue: (x) => x.status, render: (x) => <StatusBadge status={x.status} map={docTone} /> },
    { key: "requested", header: "Requested", sortValue: (x) => x.requestedAt, render: (x) => <span className="text-xs text-muted">{fmtDate(x.requestedAt)}</span> },
    { key: "received", header: "Received", sortValue: (x) => x.receivedAt ?? "", render: (x) => <span className="text-xs text-muted">{x.receivedAt ? fmtDateTime(x.receivedAt) : "—"}</span> },
    { key: "actions", header: "", align: "right", render: (x) => (<div className="flex justify-end gap-1.5">{x.status === "requested" || x.status === "rejected" ? <Button size="sm" variant="outline" onClick={() => toast.result(d.setDocumentStatus(x.id, "received"))}><Inbox className="h-3.5 w-3.5" /> Mark received</Button> : null}{x.status === "received" ? <><Button size="sm" variant="success" onClick={() => toast.result(d.setDocumentStatus(x.id, "verified"))}><CheckCircle2 className="h-3.5 w-3.5" /> Verify</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => setRejectId(x.id)}>Reject</Button></> : null}</div>) },
  ];
  return (
    <>
      <PageHeader title="Documents" subtitle="KYB document collection across all clients" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Awaiting client" value={d.documents.filter((x) => x.status === "requested").length} tone="brand" />
        <Stat label="To review" value={d.documents.filter((x) => x.status === "received").length} hint="received, not yet verified" tone="warning" />
        <Stat label="Rejected" value={d.documents.filter((x) => x.status === "rejected").length} tone="warning" />
        <Stat label="Verified" value={d.documents.filter((x) => x.status === "verified").length} tone="success" />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" /><Input className="pl-9" placeholder="Search documents or clients…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="w-full sm:w-44"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{["requested", "received", "verified", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}</Select></div>
      </div>
      <DataTable rows={rows} columns={columns} rowKey={(x) => x.id} initialSort={{ key: "status", dir: "asc" }} />
      <RejectDocDialog open={!!rejectId} onClose={() => setRejectId(null)} onConfirm={(reason) => rejectId && toast.result(d.setDocumentStatus(rejectId, "rejected", reason))} />
    </>
  );
}
