import Link from "next/link";
import { month } from "@/lib/format";
import { withParams, type Search } from "@/lib/params";

// The page-level scope: which run, and which slice. Lives in the URL so a view can be sent as a link.
export function ScopeBar({ path, sp, runs, run, tabs, tab }: {
  path: string; sp: Search;
  runs: { run_id: string | null; run_month: string | null; status: string | null }[];
  run: string | undefined;
  tabs?: readonly (readonly [string, string])[]; tab?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap rounded border border-line text-sm">
        {runs.map((r) => (
          <Link key={r.run_id} href={withParams(path, sp, { run: r.run_id ?? undefined })}
            className={`px-3 py-1.5 ${run === r.run_id ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
            {month(r.run_month)}{r.status === "Open" ? "" : ` · ${r.status}`}
          </Link>
        ))}
        <Link href={withParams(path, sp, { run: "all" })} className={`px-3 py-1.5 ${!run ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>All runs</Link>
      </div>
      {tabs ? (
        <div className="flex rounded border border-line text-sm">
          {tabs.map(([v, label]) => (
            <Link key={v} href={withParams(path, sp, { view: v })}
              className={`px-3 py-1.5 ${tab === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{label}</Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
