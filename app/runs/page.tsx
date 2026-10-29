import Link from "next/link";
import { db, must } from "@/lib/db";
import { runs } from "@/lib/lookups";
import { day, month } from "@/lib/format";
import { total } from "@/lib/summary";
import { Badge, PageHead, Panel, TableBox } from "@/components/ui";
import { kickOff } from "./actions";

export const dynamic = "force-dynamic";

type Preview = { exists: boolean; run_id: string; returns: number; run_month: string };

export default async function RunsPage() {
  const [all, summary, preview] = await Promise.all([
    runs(),
    db().from("run_summary").select("run_id, flag, tier, stage_n, stage, returns").then(must),
    db().rpc("next_run_preview").then(must) as Promise<Preview>,
  ]);

  return (
    <>
      <PageHead title="Runs" sub="One run a month: release by business day 5, submit by the 19th." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TableBox>
          <table className="grid-table">
            <thead><tr><th>Run</th><th>Status</th><th>Periods</th><th>Release by</th><th>Submit by</th><th className="text-right">Returns</th><th className="text-right">Released</th><th className="text-right">Submitted</th></tr></thead>
            <tbody>
              {all.map((r) => {
                const rows = summary.filter((s) => s.run_id === r.run_id);
                const n = total(rows);
                return (
                  <tr key={r.run_id}>
                    <td><Link className="font-medium text-accent hover:underline" href={`/runs/${r.run_id}`}>{month(r.run_month)}</Link></td>
                    <td><Badge tone={r.status === "Open" ? "info" : "plain"}>{r.status}</Badge></td>
                    <td className="num whitespace-nowrap text-muted">{day(r.period_start)} – {day(r.period_end)}</td>
                    <td className="num whitespace-nowrap">{day(r.release_by)}</td>
                    <td className="num whitespace-nowrap">{day(r.submit_by)}</td>
                    <td className="num text-right">{n.toLocaleString()}</td>
                    <td className="num text-right">{total(rows, (s) => (s.stage_n ?? 0) >= 6).toLocaleString()}</td>
                    <td className="num text-right">{total(rows, (s) => (s.stage_n ?? 0) >= 8).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>

        <Panel title="Kick off the next run">
          <div className="space-y-3 px-4 py-3">
            {preview.exists ? (
              <p className="text-muted">The {month(preview.run_month)} run already exists. <Link className="text-accent hover:underline" href={`/runs/${preview.run_id}`}>Open it</Link>.</p>
            ) : (
              <>
                <p><span className="font-medium">{month(preview.run_month)}</span> would start with <span className="num font-medium">{preview.returns.toLocaleString()}</span> returns: every active registration with a period ending that month, each with its owners and checklist. The rules then decide which steps each return needs.</p>
                <form action={kickOff} className="space-y-3">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" name="confirm" value="yes" required className="mt-1" />
                    <span>Create the {month(preview.run_month)} run now</span>
                  </label>
                  <button className="btn btn-primary">Kick off {month(preview.run_month)}</button>
                </form>
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
