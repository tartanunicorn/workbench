"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { setTaskStatus } from "@/app/tasks/actions";
import type { FilterModel, Scope } from "@/lib/grid";
import { DATE, DataGrid, NUMBER, TEXT, type GridHandle } from "./data-grid";
import { BadgeCell, linkCell } from "./cells";

const TIMING = ["Overdue", "Due today", "Due soon", "Upcoming", "No due date"] as const;

function StatusActions(p: ICellRendererParams & { onChanged: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  if (!p.data) return null;
  const { task_id, status, is_blocked } = p.data;
  const moves: [string, string][] =
    status === "Not started" ? [["In progress", "Start"], ["Done", "Done"]]
    : status === "In progress" ? [["Done", "Done"], ["Not started", "Undo"]]
    : status === "Done" || status === "Skipped" ? [["Not started", "Reopen"]] : [];
  const go = async (to: string) => {
    setBusy(true);
    const f = new FormData(); f.set("task_id", task_id); f.set("status", to);
    try { await setTaskStatus(f); p.onChanged(); } catch (e) { p.onError(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return (
    <span className="flex h-full items-center gap-1">
      {moves.map(([to, label]) => (
        <button key={to} disabled={busy || (to === "Done" && is_blocked)} onClick={() => go(to)}
          title={to === "Done" && is_blocked ? `Blocked by ${p.data.blocked_by}` : undefined}
          className={`btn inline-flex h-7 items-center px-2.5 py-0 text-xs leading-none ${to === "Done" ? "font-semibold" : "text-muted"}`}>{label}</button>
      ))}
    </span>
  );
}

// The task list: every task in scope, filtered and sorted in the database. Cards above set the Timing filter.
export function TasksGrid({ scope, counts, initialFilter, height, showParent = true, cards = true }: {
  scope: Scope[]; counts?: Record<string, number>; initialFilter?: FilterModel; height?: string; showParent?: boolean; cards?: boolean;
}) {
  const grid = useRef<GridHandle>(null);
  const router = useRouter();
  const [timing, setTiming] = useState<string | null>(initialFilter?.due_flag && "filter" in initialFilter.due_flag ? String(initialFilter.due_flag.filter) : null);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<ColDef[]>(() => [
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
    { colId: "actions", headerName: "", width: 150, sortable: false, filter: false, resizable: false, pinned: "right",
      cellRenderer: StatusActions, cellRendererParams: { onChanged: () => { grid.current?.refresh(); router.refresh(); }, onError: setError } },
  ], [showParent, router]);

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
              className={`rounded border px-4 py-2.5 text-left ${timing === t ? "border-ink" : "border-line hover:border-muted"} bg-panel`}>
              <div className="text-xs tracking-wide text-muted uppercase">{t}</div>
              <div className={`num mt-0.5 text-2xl font-semibold ${t === "Overdue" && (counts[t] ?? 0) > 0 ? "text-bad" : ""}`}>{(counts[t] ?? 0).toLocaleString()}</div>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <div className="rounded border border-bad bg-bad-bg px-3 py-2 text-sm text-bad">{error}</div> : null}
      <DataGrid ref={grid} grid="tasks" columns={columns} scope={scope} initialFilter={initialFilter} height={height} noun={["task", "tasks"]}
        onFilterChange={(m) => setTiming(m.due_flag && "filter" in m.due_flag ? String(m.due_flag.filter) : null)} />
    </div>
  );
}
