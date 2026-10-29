import Link from "next/link";
import { Checkbox } from "@/components/ui-kit/checkbox";
import { Submit } from "@/components/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui-kit/table";
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
          <Table>
            <TableHeader><TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Periods</TableHead><TableHead>Release by</TableHead><TableHead>Submit by</TableHead><TableHead className="text-right">Returns</TableHead><TableHead className="text-right">Released</TableHead><TableHead className="text-right">Submitted</TableHead></TableRow></TableHeader>
            <TableBody>
              {all.map((r) => {
                const rows = summary.filter((s) => s.run_id === r.run_id);
                const n = total(rows);
                return (
                  <TableRow key={r.run_id}>
                    <TableCell><Link className="font-medium underline decoration-border underline-offset-2 hover:decoration-foreground" href={`/runs/${r.run_id}`}>{month(r.run_month)}</Link></TableCell>
                    <TableCell><Badge tone={r.status === "Open" ? "info" : "plain"}>{r.status}</Badge></TableCell>
                    <TableCell className="num whitespace-nowrap text-muted-foreground">{day(r.period_start)} – {day(r.period_end)}</TableCell>
                    <TableCell className="num whitespace-nowrap">{day(r.release_by)}</TableCell>
                    <TableCell className="num whitespace-nowrap">{day(r.submit_by)}</TableCell>
                    <TableCell className="num text-right">{n.toLocaleString()}</TableCell>
                    <TableCell className="num text-right">{total(rows, (s) => (s.stage_n ?? 0)>= 6).toLocaleString()}</TableCell>
                    <TableCell className="num text-right">{total(rows, (s) => (s.stage_n ?? 0)>= 8).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableBox>

        <Panel title="Kick off the next run">
          <div className="space-y-3 px-4 py-3">
            {preview.exists ? (
              <p className="text-muted-foreground">The {month(preview.run_month)} run already exists. <Link className="underline decoration-border underline-offset-2 hover:decoration-foreground" href={`/runs/${preview.run_id}`}>Open it</Link>.</p>
            ) : (
              <>
                <p><span className="font-medium">{month(preview.run_month)}</span> would start with <span className="num font-medium">{preview.returns.toLocaleString()}</span> returns: one for every active registration with a period ending that month, each with its owners and tasks. The rules then decide which tasks each return needs.</p>
                <form action={kickOff} className="space-y-3">
                  <label className="flex items-start gap-2">
                    <Checkbox name="confirm" value="yes" required className="mt-0.5" />
                    <span>Create the {month(preview.run_month)} run now</span>
                  </label>
                  <Submit>Kick off {month(preview.run_month)}</Submit>
                </form>
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
