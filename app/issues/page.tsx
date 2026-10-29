import { one, withParams, type Search } from "@/lib/params";
import type { Scope } from "@/lib/grid";
import { PageHead } from "@/components/ui";
import { IssuesGrid } from "@/components/grids/issues-grid";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VIEWS = [["open", "Not resolved"], ["all", "All"]] as const;

export default async function IssuesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = one(sp, "view") === "all" ? "all" : "open";
  const scope: Scope[] = view === "open" ? [{ field: "status", op: "notIn", value: ["Resolved", "Won't fix"] }] : [];
  return (
    <>
      <PageHead title="Issues" sub="Problems that block returns or put them at risk. A return with an open issue is review tier A until the issue is resolved." />
      <div className="mb-3 flex w-fit rounded border border-line text-sm">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={withParams("/issues", sp, { view: v })} className={`px-3 py-1.5 ${view === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </div>
      <IssuesGrid key={view} scope={scope} />
    </>
  );
}
