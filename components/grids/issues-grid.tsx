"use client";
import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Link from "next/link";
import type { Scope } from "@/lib/grid";
import { Badge } from "@/components/ui";
import { DATE, DataGrid, NUMBER, TEXT } from "./data-grid";

function Severity(p: ICellRendererParams) {
  if (!p.value) return null;
  return <Badge tone={p.value === "S1" ? "bad" : p.value === "S2" ? "warn" : "plain"}>{p.value}</Badge>;
}

function Status(p: ICellRendererParams) {
  if (!p.value) return null;
  return <Badge tone={p.value === "Resolved" ? "good" : "plain"}>{p.value}</Badge>;
}

function Affects(p: ICellRendererParams) {
  if (!p.value) return null;
  return (
    <span className="flex gap-2 overflow-hidden">
      {String(p.value).split(", ").map((id) => id.startsWith("RET-")
        ? <Link key={id} href={`/returns/${id}`} className="font-mono text-xs underline decoration-line underline-offset-2">{id}</Link>
        : <span key={id} className="font-mono text-xs text-muted">{id}</span>)}
    </span>
  );
}

export function IssuesGrid({ scope }: { scope: Scope[] }) {
  const columns = useMemo<ColDef[]>(() => [
    { field: "category", headerName: "Issue", width: 220, ...TEXT },
    { field: "description", headerName: "Description", flex: 3, minWidth: 260, ...TEXT, tooltipField: "description" },
    { field: "severity", headerName: "Severity", width: 110, ...TEXT, cellRenderer: Severity },
    { field: "status", headerName: "Status", width: 170, ...TEXT, cellRenderer: Status },
    { field: "opened_on", headerName: "Opened", width: 130, ...DATE },
    { field: "due_by", headerName: "Due", width: 130, ...DATE },
    { field: "returns_affected", headerName: "Returns", width: 110, ...NUMBER },
    { field: "affects", headerName: "Affects", flex: 2, minWidth: 200, ...TEXT, cellRenderer: Affects },
    { field: "resolution", headerName: "Resolution", flex: 2, minWidth: 200, ...TEXT, tooltipField: "resolution", hide: true },
  ], []);
  return <DataGrid grid="issues" columns={columns} scope={scope} noun={["issue", "issues"]} />;
}
