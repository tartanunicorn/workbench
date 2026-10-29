import { month } from "@/lib/format";
import { withParams, type Search } from "@/lib/params";
import { Segments } from "@/components/ui";

// The page-level scope: which run, and which slice. Lives in the URL so a view can be sent as a link.
export function ScopeBar({ path, sp, runs, run, tabs, tab }: {
  path: string; sp: Search;
  runs: { run_id: string | null; run_month: string | null; status: string | null }[];
  run: string | undefined;
  tabs?: readonly (readonly [string, string])[]; tab?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Segments items={[
        ...runs.map((r) => ({
          key: r.run_id ?? "", href: withParams(path, sp, { run: r.run_id ?? undefined }), on: run === r.run_id,
          label: `${month(r.run_month)}${r.status === "Open" ? "" : ` · ${r.status}`}`,
        })),
        { key: "all", href: withParams(path, sp, { run: "all" }), on: !run, label: "All runs" },
      ]} />
      {tabs ? <Segments items={tabs.map(([v, label]) => ({ key: v, label, href: withParams(path, sp, { view: v }), on: tab === v }))} /> : null}
    </div>
  );
}
