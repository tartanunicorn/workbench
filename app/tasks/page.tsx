import { db, must } from "@/lib/db";
import { currentRun, runs } from "@/lib/lookups";
import { one, type Search } from "@/lib/params";
import { month } from "@/lib/format";
import type { Scope } from "@/lib/grid";
import { PageHead } from "@/components/ui";
import { ScopeBar } from "@/components/scope-bar";
import { TasksGrid } from "@/components/grids/tasks-grid";

export const dynamic = "force-dynamic";

const VIEWS = [["open", "To do"], ["done", "Done or skipped"], ["all", "All"]] as const;
const STATUSES: Record<string, string[] | null> = { open: ["Not started", "In progress"], done: ["Done", "Skipped"], all: null };
const HEADERS = ["Run", "Return"]; // a run's and a return's own task hold the others; the Runs and Returns pages show them

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const [run, allRuns] = await Promise.all([currentRun(), runs()]);
  const runId = one(sp, "run") === "all" ? undefined : one(sp, "run") ?? run?.run_id ?? undefined;
  const view = one(sp, "view") && one(sp, "view")! in STATUSES ? one(sp, "view")! : "open";
  const statuses = STATUSES[view];

  const scope: Scope[] = [{ field: "kind", op: "notIn", value: HEADERS }];
  if (runId) scope.push({ field: "run_id", op: "eq", value: runId });
  if (statuses) scope.push({ field: "status", op: "in", value: statuses });

  let summary = db().from("task_summary").select("due_flag, tasks").not("kind", "in", `(${HEADERS.join(",")})`);
  if (runId) summary = summary.eq("run_id", runId);
  if (statuses) summary = summary.in("status", statuses);
  const counts: Record<string, number> = {};
  for (const r of must(await summary)) counts[r.due_flag ?? ""] = (counts[r.due_flag ?? ""] ?? 0) + (r.tasks ?? 0);

  const runName = runId ? `the ${month(allRuns.find((r) => r.run_id === runId)?.run_month)} run` : "every run";
  return (
    <>
      <PageHead title="Tasks" sub={`Every task in ${runName}, soonest due first. Filter any column in the row under its name.`} />
      <ScopeBar path="/tasks" sp={sp} runs={allRuns} run={runId} tabs={VIEWS} tab={view} />
      <TasksGrid key={`${runId}-${view}`} scope={scope} counts={counts} cards={view !== "done"} />
    </>
  );
}
