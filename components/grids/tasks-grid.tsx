"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { toast } from "sonner";
import { setTaskStatus } from "@/app/tasks/actions";
import { Button } from "@/components/ui-kit/button";
import type { FilterModel, Scope } from "@/lib/grid";
import { DATE, DataGrid, NUMBER, TEXT, type GridHandle } from "./data-grid";
import { AffectsCell, BadgeCell, PriorityCell, linkCell } from "./cells";

const TIMING = ["Overdue", "Due today", "Due soon", "Upcoming", "No due date"] as const;

function StatusActions(p: ICellRendererParams & { onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!p.data) return null;
  const { task_id, status, is_blocked } = p.data;
  const moves: [string, string][] =
    status === "Not started" ? [["In progress", "Start"], ["Done", "Done"]]
    : status === "In progress" ? [["Done", "Done"], ["Not started", "Undo"]]
    : status === "Waiting" ? [["Done", "Done"], ["In progress", "Resume"]]
    : status === "Done" || status === "Skipped" ? [["Not started", "Reopen"]] : [];
  const go = async (to: string) => {
    setBusy(true);
    const f = new FormData(); f.set("task_id", task_id); f.set("status", to);
    try { await setTaskStatus(f); p.onChanged(); toast.success(`${p.data.title}: ${to}`); }
    catch (e) { toast.error("Couldn\u2019t change the task", { description: e instanceof Error ? e.message : String(e) }); }
    setBusy(false);
  };
  return (
    <span className="flex h-full items-center gap-1">
      {moves.map(([to, label]) => (
        <Button key={to} variant="outline" size="xs" disabled={busy || (to === "Done" && is_blocked)} onClick={() => go(to)}
          title={to === "Done" && is_blocked ? `Blocked by ${p.data.blocked_by}` : undefined}
          className={to === "Done" ? "font-semibold" : "text-muted-foreground"}>{label}</Button>
      ))}
    </span>
  );
}

// The task list: every task in scope, filtered and sorted in the database. Cards above set the Timing filter.
export function TasksGrid({ scope, counts, initialFilter, height, showParent = true, cards = true, variant = "work" }: {
  scope: Scope[]; counts?: Record<string, number>; initialFilter?: FilterModel; height?: string; showParent?: boolean; cards?: boolean;
  variant?: "work" | "issues";
}) {
  const grid = useRef<GridHandle>(null);
  const router = useRouter();
  const [timing, setTiming] = useState<string | null>(initialFilter?.due_flag && "filter" in initialFilter.due_flag ? String(initialFilter.due_flag.filter) : null);

  const actions: ColDef = { colId: "actions", headerName: "", width: 150, sortable: false, filter: false, resizable: false, pinned: "right", cellClass: "flex items-center",
    cellRenderer: StatusActions, cellRendererParams: { onChanged: () => { grid.current?.refresh(); router.refresh(); } } };

  const columns = useMemo<ColDef[]>(() => variant === "issues" ? [
    { field: "title", headerName: "Issue", flex: 2, minWidth: 260, ...TEXT, tooltipField: "description" },
    { field: "priority", headerName: "Priority", width: 110, ...TEXT, cellRenderer: PriorityCell },
    { field: "category", headerName: "Category", width: 200, ...TEXT },
    { field: "status", headerName: "Status", width: 130, ...TEXT, cellRenderer: BadgeCell },
    { field: "waiting_on", headerName: "Waiting on", width: 130, ...TEXT },
    { field: "owner_name", headerName: "Owner", width: 160, ...TEXT },
    { field: "customer_name", headerName: "Customer", width: 150, ...TEXT },
    { field: "returns_affected", headerName: "Returns", width: 110, ...NUMBER },
    { field: "affects", headerName: "Affects", flex: 1, minWidth: 180, ...TEXT, cellRenderer: AffectsCell },
    { field: "raised_on", headerName: "Raised", width: 150, ...DATE },
    { field: "due_date", headerName: "Due", width: 150, ...DATE },
    { field: "resolution", headerName: "Resolution", flex: 1, minWidth: 200, ...TEXT, tooltipField: "resolution", hide: true },
    { field: "description", headerName: "Description", flex: 2, minWidth: 260, ...TEXT, tooltipField: "description", hide: true },
    actions,
  ] : [
    { field: "title", headerName: "Task", flex: 2, minWidth: 240, ...TEXT, tooltipField: "notes" },
    ...(showParent ? [{ field: "parent_title", headerName: "Parent", flex: 2, minWidth: 220, ...TEXT,
      cellRenderer: linkCell((d) => (d.return_id ? `/returns/${d.return_id}` : d.run_id ? `/runs/${d.run_id}` : null)) } as ColDef] : []),
    { field: "kind_label", headerName: "Kind", width: 140, ...TEXT },
    { field: "owner_name", headerName: "Owner", width: 170, ...TEXT },
    { field: "due_date", headerName: "Due", width: 160, ...DATE },
    { field: "due_flag", headerName: "Timing", width: 140, ...TEXT, cellRenderer: BadgeCell },
    { field: "status", headerName: "Status", width: 140, ...TEXT, cellRenderer: BadgeCell },
    { field: "blocked_by", headerName: "Blocked by", width: 140, ...TEXT, hide: !showParent },
    { field: "completes_stage", headerName: "Stage", width: 100, ...NUMBER, hide: showParent },
    actions,
  ], [showParent, variant]);

  const pick = (t: string) => {
    const next = timing === t ? null : t;
    setTiming(next);
    grid.current?.setFilter("due_flag", next);
  };

  return (
    <div className="flex flex-col gap-3">
      {cards && counts ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TIMING.map((t) => (
            <button key={t} onClick={() => pick(t)} aria-pressed={timing === t}
              className={`rounded-xl border bg-card px-4 py-2.5 text-left shadow-sm transition-colors ${timing === t ? "border-foreground ring-1 ring-foreground" : "hover:border-ring"}`}>
              <div className="text-xs tracking-wide text-muted-foreground uppercase">{t}</div>
              <div className={`num mt-0.5 text-2xl font-semibold ${t === "Overdue" && (counts[t] ?? 0) > 0 ? "text-bad" : ""}`}>{(counts[t] ?? 0).toLocaleString()}</div>
            </button>
          ))}
        </div>
      ) : null}
      <DataGrid ref={grid} grid="tasks" columns={columns} scope={scope} initialFilter={initialFilter} height={height} noun={variant === "issues" ? ["issue", "issues"] : ["task", "tasks"]}
        onFilterChange={(m) => setTiming(m.due_flag && "filter" in m.due_flag ? String(m.due_flag.filter) : null)} />
    </div>
  );
}
