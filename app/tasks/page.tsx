import Link from "next/link";
import { db, must } from "@/lib/db";
import { currentRun, ownerName, owners, runs } from "@/lib/lookups";
import { one, page, searchTerm, withParams, type Search } from "@/lib/params";
import { day, month } from "@/lib/format";
import { Badge, Empty, PageHead, Pager, Stat, TableBox, flagTone } from "@/components/ui";
import { Filters, SearchBox, Select } from "@/components/filters";
import { TaskStatus } from "@/components/task-status";

export const dynamic = "force-dynamic";

const KINDS = ["Return step", "Pre-run check", "Milestone", "Chase", "Notice response", "Follow-up", "Other", "Return", "Run"];
const DUE = ["Overdue", "Due today", "Due soon", "Upcoming", "No due date"] as const;
const STATUS = [["open", "Open (not started or in progress)"], ["Not started", "Not started"], ["In progress", "In progress"], ["Done", "Done"], ["Skipped", "Skipped"], ["any", "Any status"]] as const;

type F = { run?: string; status: string; kind?: string; due?: string; owner?: string; ret?: string; q?: string };

// One place builds the filtered query, so the list and the counts above it always agree
function tasks(f: F, opts: { head?: boolean; skipDue?: boolean } = {}) {
  let q = db().from("task_board").select("*", { count: "exact", head: opts.head });
  if (f.run) q = q.eq("run_id", f.run);
  if (f.status === "open") q = q.in("status", ["Not started", "In progress"]);
  else if (f.status !== "any") q = q.eq("status", f.status);
  if (f.kind === "work" || !f.kind) q = q.not("kind", "in", "(Run,Return)");
  else if (f.kind !== "all") q = q.eq("kind", f.kind);
  if (f.due && !opts.skipDue) q = q.eq("due_flag", f.due);
  if (f.owner) q = q.eq("owner_id", f.owner);
  if (f.ret) q = q.eq("return_id", f.ret);
  if (f.q) q = q.or(`title.ilike.*${f.q}*,parent_title.ilike.*${f.q}*`);
  return q;
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const [run, allRuns, people] = await Promise.all([currentRun(), runs(), owners()]);
  const f: F = {
    run: one(sp, "run") === "all" ? undefined : one(sp, "run") ?? run?.run_id ?? undefined,
    status: one(sp, "status") ?? "open",
    kind: one(sp, "kind"),
    due: one(sp, "due"),
    owner: one(sp, "owner"),
    ret: one(sp, "return"),
    q: searchTerm(one(sp, "q")),
  };
  const p = page(sp);
  const [list, ...dueCounts] = await Promise.all([
    tasks(f).order("due_date", { ascending: true, nullsFirst: false }).order("task_id").range(p.from, p.to),
    ...DUE.map((d) => tasks({ ...f, due: d }, { head: true })),
  ]);
  const rows = must(list);
  const total = list.count ?? 0;
  const team = [...people.values()].filter((o) => o.type !== "External" && o.active).map((o) => [o.owner_id, o.name] as const);

  return (
    <>
      <PageHead title="Tasks"
        sub={<>Everything the team has to do{f.run ? <> in the {month(allRuns.find((r) => r.run_id === f.run)?.run_month)} run</> : null}, soonest first.</>} />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {DUE.map((d, i) => (
          <Stat key={d} label={d} value={(dueCounts[i].count ?? 0).toLocaleString()}
            tone={d === "Overdue" && (dueCounts[i].count ?? 0) > 0 ? "bad" : undefined}
            href={withParams("/tasks", sp, { due: f.due === d ? undefined : d })} />
        ))}
      </div>

      <Filters>
        <Select name="run" value={one(sp, "run") ?? f.run} all="Every run" allValue="all" options={allRuns.map((r) => [r.run_id!, month(r.run_month)] as const)} />
        <Select name="status" value={f.status === "open" ? undefined : f.status} all={STATUS[0][1]} options={STATUS.slice(1)} />
        <Select name="kind" value={f.kind} all="Work (no header tasks)" options={[...KINDS, ["all", "Every kind"] as const]} />
        <Select name="due" value={f.due} all="Any due date" options={DUE} />
        <Select name="owner" value={f.owner} all="Anyone" options={team} />
        <SearchBox value={one(sp, "q")} placeholder="Search tasks or returns" />
        {f.ret ? <Link className="btn" href={withParams("/tasks", sp, { return: undefined })}>Return {f.ret} ✕</Link> : null}
      </Filters>

      <TableBox>
        {rows.length === 0 ? <Empty>No tasks match these filters.</Empty> : (
          <table className="grid-table">
            <thead>
              <tr><th>Task</th><th>Part of</th><th>Kind</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.task_id}>
                  <td className="min-w-56">
                    <div className="font-medium">{t.title}</div>
                    {t.blocked_by?.length ? <div className="text-xs text-bad">Blocked by {t.blocked_by.join(", ")}</div> : null}
                    {t.notes ? <div className="text-xs text-muted">{t.notes}</div> : null}
                  </td>
                  <td className="min-w-48">
                    {t.return_id
                      ? <Link className="text-accent hover:underline" href={`/returns/${t.return_id}`}>{t.parent_kind === "Return" ? t.parent_title : t.return_id}</Link>
                      : <span className="text-muted">{t.parent_title}</span>}
                  </td>
                  <td className="whitespace-nowrap text-muted">{t.kind}</td>
                  <td className="whitespace-nowrap">{ownerName(people, t.owner_id) || <span className="text-muted">Unassigned</span>}</td>
                  <td className="num whitespace-nowrap">
                    {day(t.due_date)} {t.due_flag && t.due_flag !== "Upcoming" && t.due_flag !== t.status ? <Badge tone={flagTone(t.due_flag)}>{t.due_flag}</Badge> : null}
                  </td>
                  <td className="whitespace-nowrap"><Badge tone={flagTone(t.status)}>{t.status}</Badge></td>
                  <td><TaskStatus id={t.task_id!} status={t.status} blocked={!!t.blocked_by?.length} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableBox>
      <Pager path="/tasks" sp={sp} page={p.page} total={total} />
    </>
  );
}
