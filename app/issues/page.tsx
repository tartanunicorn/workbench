import Link from "next/link";
import { one, withParams, type Search } from "@/lib/params";
import type { Scope } from "@/lib/grid";
import { PageHead } from "@/components/ui";
import { TasksGrid } from "@/components/grids/tasks-grid";

export const dynamic = "force-dynamic";

const VIEWS = [["open", "Not resolved"], ["all", "All"]] as const;

// Issues are tasks of kind Issue: the same list, with the columns an issue needs
export default async function IssuesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = one(sp, "view") === "all" ? "all" : "open";
  const scope: Scope[] = [{ field: "kind", op: "eq", value: "Issue" }];
  if (view === "open") scope.push({ field: "status", op: "notIn", value: ["Done", "Skipped"] });
  return (
    <>
      <PageHead title="Issues" sub="Issues are tasks that block returns or put them at risk. A return affected by an open issue is review tier A until the issue is done." />
      <div className="mb-3 flex w-fit rounded border border-line text-sm">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={withParams("/issues", sp, { view: v })} className={`px-3 py-1.5 ${view === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </div>
      <TasksGrid key={view} scope={scope} variant="issues" cards={false} />
    </>
  );
}
