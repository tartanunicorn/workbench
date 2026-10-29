"use client";
import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { FilterModel, Scope } from "@/lib/grid";
import { DATE, DataGrid, NUMBER, TEXT } from "./data-grid";
import { BadgeCell, TierCell, linkCell } from "./cells";

const money = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

export function ReturnsGrid({ scope, initialFilter }: { scope: Scope[]; initialFilter?: FilterModel }) {
  const columns = useMemo<ColDef[]>(() => [
    { field: "customer_name", headerName: "Customer", flex: 2, minWidth: 180, pinned: "left", ...TEXT, cellRenderer: linkCell((d) => `/returns/${d.return_id}`) },
    { field: "type_name", headerName: "Return type", flex: 2, minWidth: 200, ...TEXT },
    { field: "place_code", headerName: "Place", width: 100, ...TEXT },
    { field: "kind", headerName: "Kind", width: 120, ...TEXT },
    { field: "period_end", headerName: "Period end", width: 150, ...DATE },
    { field: "stage", headerName: "Stage", width: 170, ...TEXT },
    { field: "stage_n", headerName: "Stage no.", width: 110, ...NUMBER, hide: true },
    { field: "state", headerName: "Status", width: 120, ...TEXT },
    { field: "tier", headerName: "Review tier", width: 120, ...TEXT, cellRenderer: TierCell },
    { field: "flag", headerName: "Health", width: 150, ...TEXT, cellRenderer: BadgeCell },
    { field: "tasks_done", headerName: "Tasks done", width: 120, ...NUMBER, valueFormatter: (p) => (p.data ? `${p.data.tasks_done}/${p.data.tasks_total}` : "") },
    { field: "release_by", headerName: "Release by", width: 150, ...DATE },
    { field: "submit_due", headerName: "Submit by", width: 150, ...DATE },
    { field: "preparer_name", headerName: "Preparer", width: 160, ...TEXT },
    { field: "reviewer_name", headerName: "Reviewer", width: 160, ...TEXT },
    { field: "open_issues", headerName: "Open issues", width: 120, ...NUMBER },
    { field: "rule_flags", headerName: "Rule notes", flex: 2, minWidth: 220, ...TEXT, tooltipField: "rule_flags" },
    { field: "calculated", headerName: "Calculated", width: 130, ...NUMBER, valueFormatter: (p) => money(p.value), hide: true },
    { field: "collected", headerName: "Collected", width: 130, ...NUMBER, valueFormatter: (p) => money(p.value), hide: true },
    { field: "gap", headerName: "Gap", width: 120, ...NUMBER, valueFormatter: (p) => money(p.value), hide: true },
    { field: "return_id", headerName: "Return ID", width: 130, ...TEXT, hide: true, cellClass: "font-mono" },
  ], []);
  return <DataGrid grid="returns" columns={columns} scope={scope} initialFilter={initialFilter} noun={["return", "returns"]} />;
}
