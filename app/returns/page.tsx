import Link from "next/link";
import { db, must } from "@/lib/db";
import { currentRun, ownerName, owners, runs } from "@/lib/lookups";
import { one, page, searchTerm, withParams, type Search } from "@/lib/params";
import { day, month } from "@/lib/format";
import { FLAG_ORDER } from "@/lib/summary";
import { Badge, Empty, PageHead, Pager, TableBox, flagTone } from "@/components/ui";
import { Filters, SearchBox, Select } from "@/components/filters";

export const dynamic = "force-dynamic";

const STAGES = [
  ["1", "1 Not started"], ["2", "2 Data synced"], ["3", "3 Generated"], ["4", "4 In review"], ["5", "5 Ready to release"],
  ["6", "6 Released"], ["7", "7 Customer approved"], ["8", "8 Submitted"], ["9", "9 Confirmed / paid"],
  ["unreleased", "Not yet released"], ["released", "Released or later"], ["submitted", "Submitted or later"],
] as const;
const TIERS = [["A", "Tier A"], ["B", "Tier B"], ["?", "Tier unknown"]] as const;

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const [run, allRuns, people] = await Promise.all([currentRun(), runs(), owners()]);
  const runId = one(sp, "run") === "all" ? undefined : one(sp, "run") ?? run?.run_id ?? undefined;
  const stage = one(sp, "stage"), flag = one(sp, "flag"), tier = one(sp, "tier"), owner = one(sp, "owner");
  const issues = one(sp, "issues"), q = searchTerm(one(sp, "q"));
  const p = page(sp);

  let query = db().from("return_board")
    .select("return_id, customer_name, type_name, place_code, kind, period_start, period_end, stage, stage_n, state, tier, tier_reasons, tier_unknowns, rule_flags, flag, steps_done, steps_total, release_by, submit_due, preparer, reviewer, open_issues", { count: "exact" });
  if (runId) query = query.eq("run_id", runId);
  if (stage === "unreleased") query = query.lt("stage_n", 6);
  else if (stage === "released") query = query.gte("stage_n", 6);
  else if (stage === "submitted") query = query.gte("stage_n", 8);
  else if (stage) query = query.eq("stage_n", Number(stage));
  if (flag) query = query.eq("flag", flag);
  if (tier) query = query.eq("tier", tier);
  if (owner) query = query.or(`preparer.eq.${owner},reviewer.eq.${owner}`);
  if (issues === "open") query = query.gt("open_issues", 0);
  if (q) query = query.or(`customer_name.ilike.*${q}*,type_name.ilike.*${q}*,return_id.ilike.*${q}*,place_code.ilike.*${q}*`);
  const res = await query.order("submit_due", { ascending: true }).order("return_id").range(p.from, p.to);
  const rows = must(res);
  const team = [...people.values()].filter((o) => o.type === "Internal" && o.active).map((o) => [o.owner_id, o.name] as const);

  return (
    <>
      <PageHead title="Returns" sub={<>Each return is a task with its checklist under it{runId ? <> · {month(allRuns.find((r) => r.run_id === runId)?.run_month)} run</> : null}.</>} />
      <Filters>
        <Select name="run" value={one(sp, "run") ?? runId} all="Every run" allValue="all" options={allRuns.map((r) => [r.run_id!, month(r.run_month)] as const)} />
        <Select name="flag" value={flag} all="Any flag" options={FLAG_ORDER} />
        <Select name="stage" value={stage} all="Any stage" options={STAGES} />
        <Select name="tier" value={tier} all="Any tier" options={TIERS} />
        <Select name="owner" value={owner} all="Any preparer or reviewer" options={team} />
        <Select name="issues" value={issues} all="With or without issues" options={[["open", "Has an open issue"]]} />
        <SearchBox value={one(sp, "q")} placeholder="Customer, return type or place" />
      </Filters>

      <TableBox>
        {rows.length === 0 ? <Empty>No returns match these filters.</Empty> : (
          <table className="grid-table">
            <thead><tr><th>Return</th><th>Period</th><th>Stage</th><th>Tier</th><th>Flag</th><th className="text-right">Steps</th><th>Submit by</th><th>Preparer</th><th>Reviewer</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.return_id}>
                  <td className="min-w-64">
                    <Link className="font-medium text-accent hover:underline" href={`/returns/${r.return_id}`}>{r.customer_name}</Link>
                    <div className="text-xs text-muted">{r.type_name} · {r.place_code}{r.kind !== "Regular" ? ` · ${r.kind}` : ""}</div>
                    {r.rule_flags?.map((f) => <div key={f} className="text-xs text-warn">{f}</div>)}
                  </td>
                  <td className="num whitespace-nowrap text-muted">{day(r.period_start)} – {day(r.period_end)}</td>
                  <td className="whitespace-nowrap">{r.stage}{r.state !== "Open" ? <div className="text-xs text-muted">{r.state}</div> : null}</td>
                  <td>
                    <Badge tone={r.tier === "A" ? "warn" : r.tier === "?" ? "info" : "plain"}
                      title={r.tier === "A" ? r.tier_reasons?.join(", ") : r.tier === "?" ? `Can't tell yet: ${r.tier_unknowns?.join(", ")}` : "No tier A reason applies"}>
                      {r.tier}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap"><Badge tone={flagTone(r.flag)}>{r.flag}</Badge>{r.open_issues ? <div className="text-xs text-bad">{r.open_issues} open issue{r.open_issues > 1 ? "s" : ""}</div> : null}</td>
                  <td className="num text-right whitespace-nowrap">
                    <Link className="hover:underline" href={`/tasks?return=${r.return_id}&run=all&status=any&kind=all`}>{r.steps_done}/{r.steps_total}</Link>
                  </td>
                  <td className="num whitespace-nowrap">{day(r.submit_due)}</td>
                  <td className="whitespace-nowrap">{ownerName(people, r.preparer)}</td>
                  <td className="whitespace-nowrap">{ownerName(people, r.reviewer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableBox>
      <Pager path="/returns" sp={sp} page={p.page} total={res.count ?? 0} />
    </>
  );
}
