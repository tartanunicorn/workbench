import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { ownerName, owners, runs } from "@/lib/lookups";
import { day, month } from "@/lib/format";
import { byFlag, byStage, sumBy, total } from "@/lib/summary";
import { Badge, PageHead, Panel, Stat, flagTone } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = (await runs()).find((r) => r.run_id === id);
  if (!run) notFound();

  const [summary, tasks, people] = await Promise.all([
    db().from("run_summary").select("flag, tier, stage_n, stage, returns, steps_total, steps_done").eq("run_id", id).then(must),
    db().from("task_summary").select("kind, status, due_flag, owner_id, tasks").eq("run_id", id).then(must),
    owners(),
  ]);

  const n = total(summary);
  const released = total(summary, (s) => (s.stage_n ?? 0) >= 6);
  const submitted = total(summary, (s) => (s.stage_n ?? 0) >= 8);
  const tiers = sumBy(summary, (s) => s.tier, (s) => s.returns);
  const flags = byFlag(summary);
  const stages = byStage(summary);
  const open = tasks.filter((t) => (t.status === "Not started" || t.status === "In progress") && t.kind !== "Run" && t.kind !== "Return");
  const overdue = open.filter((t) => t.due_flag === "Overdue");
  const overdueByOwner = [...sumBy(overdue, (t) => t.owner_id, (t) => t.tasks).entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const r = `/returns?run=${id}`;

  return (
    <>
      <PageHead title={`${month(run.run_month)} run`}
        sub={<>Periods {day(run.period_start)} – {day(run.period_end)} · as of {day(run.as_of)}, returns should be at stage {run.expected_stage}</>}>
        <Badge tone={run.status === "Open" ? "info" : "plain"}>{run.status}</Badge>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Returns" value={n.toLocaleString()} href={r} />
        <Stat label={`Released (by ${day(run.release_by)})`} value={`${released.toLocaleString()}`} href={`${r}&stage=released`} />
        <Stat label={`Submitted (by ${day(run.submit_by)})`} value={submitted.toLocaleString()} href={`${r}&stage=submitted`} />
        <Stat label="Review tier A" value={(tiers.get("A") ?? 0).toLocaleString()} href={`${r}&tier=A`} />
        <Stat label="Review tier ?" value={(tiers.get("?") ?? 0).toLocaleString()} href={`${r}&tier=%3F`} tone={(tiers.get("?") ?? 0) > 0 ? "warn" : undefined} />
        <Stat label="Overdue tasks" value={total(overdue.map((t) => ({ returns: t.tasks })))} href={`/tasks?run=${id}&due=Overdue`} tone={overdue.length ? "bad" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Returns by health">
          <ul className="divide-y divide-border">
            {flags.map(([flag, count]) => (
              <li key={flag}>
                <Link href={`${r}&health=${encodeURIComponent(flag)}`} className="flex items-center justify-between px-4 py-2 hover:bg-muted">
                  <Badge tone={flagTone(flag)}>{flag || "Not known"}</Badge><span className="num">{count.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Returns by stage">
          <ul className="space-y-2 px-4 py-3">
            {stages.map((s) => (
              <li key={s.stage_n}>
                <Link href={`${r}&stage=${s.stage_n}`} className="block hover:underline">
                  <div className="flex justify-between text-sm"><span>{s.stage}</span><span className="num">{s.returns.toLocaleString()}</span></div>
                  <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${n ? (s.returns / n) * 100 : 0}%` }} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Overdue tasks by owner">
          {overdueByOwner.length === 0 ? <p className="px-4 py-3 text-muted-foreground">Nothing overdue.</p> : (
            <ul className="divide-y divide-border">
              {overdueByOwner.map(([o, count]) => (
                <li key={o}>
                  <Link href={`/tasks?run=${id}&due=Overdue${o ? `&owner=${o}` : ""}`} className="flex justify-between px-4 py-2 hover:bg-muted">
                    <span>{ownerName(people, o) || "Unassigned"}</span><span className="num">{count.toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
