import { currentRun, runs } from "@/lib/lookups";
import { one, type Search } from "@/lib/params";
import { month } from "@/lib/format";
import type { FilterModel, Scope } from "@/lib/grid";
import { PageHead } from "@/components/ui";
import { ScopeBar } from "@/components/scope-bar";
import { ReturnsGrid } from "@/components/grids/returns-grid";

export const dynamic = "force-dynamic";

// Links from the run page arrive as ?health=…&tier=…&stage=… and open the grid already filtered
function linkedFilter(sp: Search): FilterModel {
  const f: FilterModel = {};
  const health = one(sp, "health"), tier = one(sp, "tier"), stage = one(sp, "stage");
  if (health) f.flag = { filterType: "text", type: "equals", filter: health };
  if (tier) f.tier = { filterType: "text", type: "equals", filter: tier };
  if (stage === "released") f.stage_n = { filterType: "number", type: "greaterThanOrEqual", filter: 6 };
  else if (stage === "submitted") f.stage_n = { filterType: "number", type: "greaterThanOrEqual", filter: 8 };
  else if (stage === "unreleased") f.stage_n = { filterType: "number", type: "lessThan", filter: 6 };
  else if (stage && /^\d$/.test(stage)) f.stage_n = { filterType: "number", type: "equals", filter: Number(stage) };
  return f;
}

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const [run, allRuns] = await Promise.all([currentRun(), runs()]);
  const runId = one(sp, "run") === "all" ? undefined : one(sp, "run") ?? run?.run_id ?? undefined;
  const scope: Scope[] = runId ? [{ field: "run_id", op: "eq", value: runId }] : [];
  const runName = runId ? `the ${month(allRuns.find((r) => r.run_id === runId)?.run_month)} run` : "every run";

  return (
    <>
      <PageHead title="Returns" sub={`Every return in ${runName}. Open one to see its tasks and why the rules put it where it is.`} />
      <ScopeBar path="/returns" sp={sp} runs={allRuns} run={runId} />
      <ReturnsGrid key={`${runId}-${JSON.stringify(sp)}`} scope={scope} initialFilter={linkedFilter(sp)} />
    </>
  );
}
