import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { ownerName, owners } from "@/lib/lookups";
import { day, money } from "@/lib/format";
import { parseEvidence } from "@/lib/evidence";
import { ruleKind } from "@/lib/words";
import { Badge, PageHead, Panel, Stat, flagTone } from "@/components/ui";
import { Evidence, resultTone } from "@/components/evidence";
import { TasksGrid } from "@/components/grids/tasks-grid";
import { reevaluate, setAmounts } from "../actions";

export const dynamic = "force-dynamic";

const KIND_ORDER = ["Tier A", "Include step", "Leave out step", "Flag"];

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ret] = must(await db().from("return_board").select("*").eq("return_id", id));
  if (!ret) notFound();

  const [rules, events, links, people] = await Promise.all([
    db().from("return_rules").select("*").eq("return_id", id).order("rule_id").then(must),
    db().from("return_events").select("event_id, at, from_stage, to_stage, from_state, to_state, actor, source, note")
      .eq("return_id", id).is("deleted_at", null).order("at", { ascending: false }).limit(30).then(must),
    db().from("task_relations").select("relation_id, issue:tasks!task_relations_from_task_id_fkey(task_id, title, kind, category, priority, status, waiting_on, description)")
      .eq("to_task_id", ret.header_task_id ?? "").eq("relation_type", "Affects").is("deleted_at", null).then(must),
    owners(),
  ]);
  const sortedRules = [...rules].sort((a, b) => KIND_ORDER.indexOf(a.kind ?? "") - KIND_ORDER.indexOf(b.kind ?? ""));
  const pinned = rules.some((r) => r.pinned);

  return (
    <>
      <div className="mb-2 text-sm text-muted">
        <Link className="hover:underline" href={`/returns?run=${ret.run_id}`}>Returns</Link> / <span className="font-mono">{ret.return_id}</span>
      </div>
      <PageHead title={ret.customer_name ?? id}
        sub={<><Link className="underline decoration-line underline-offset-2 hover:decoration-ink" href={`/registration-types/${ret.registration_type_id}`}>{ret.type_name}</Link> · {ret.customer_name ? <Link className="underline decoration-line underline-offset-2 hover:decoration-ink" href={`/customers/${ret.customer_id}`}>customer page</Link> : null} · period {day(ret.period_start)} – {day(ret.period_end)}{ret.kind !== "Regular" ? ` · ${ret.kind}` : ""}</>}>
        <Badge tone={flagTone(ret.flag)}>{ret.flag}</Badge>
        <Badge tone={ret.tier === "A" ? "warn" : ret.tier === "?" ? "info" : "plain"}>Review tier {ret.tier}</Badge>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Stage" value={<span className="text-base">{ret.stage}</span>} />
        <Stat label="Status" value={<span className="text-base">{ret.state}</span>} />
        <Stat label="Tasks done" value={`${ret.steps_done}/${ret.steps_total}`} />
        <Stat label="Release by" value={day(ret.release_by)} />
        <Stat label="Submit by" value={day(ret.submit_due)} />
        <Stat label="Preparer" value={<span className="text-base">{ownerName(people, ret.preparer) || "None"}</span>} />
        <Stat label="Reviewer" value={<span className="text-base">{ownerName(people, ret.reviewer) || "None"}</span>} />
      </div>

      {ret.rule_flags?.length ? (
        <div className="mb-4 rounded border border-warn bg-warn-bg px-4 py-2.5 text-warn">Rule notes: {ret.rule_flags.join(" · ")}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title="Tasks">
            <div className="p-3">
              <TasksGrid scope={[{ field: "return_id", op: "eq", value: id }, { field: "kind", op: "notIn", value: ["Return", "Run"] }]}
                showParent={false} cards={false} height="380px" />
            </div>
          </Panel>

          <Panel title="History">
            {events.length === 0 ? <p className="px-4 py-3 text-muted">No changes yet.</p> : (
              <div className="max-h-80 overflow-y-auto">
                <table className="grid-table">
                  <thead><tr><th>When</th><th>Change</th><th>By</th><th>Note</th></tr></thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.event_id}>
                        <td className="num whitespace-nowrap text-muted">{day(e.at)}</td>
                        <td>
                          {e.from_stage !== e.to_stage && e.to_stage ? <>Stage {e.from_stage ?? "none"} → <span className="font-medium">{e.to_stage}</span></> : null}
                          {e.from_state !== e.to_state && e.to_state ? <> Status {e.from_state ?? "none"} → <span className="font-medium">{e.to_state}</span></> : null}
                        </td>
                        <td className="whitespace-nowrap">{ownerName(people, e.actor) || e.source}</td>
                        <td className="text-muted">{e.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title={<span className="flex justify-between gap-2"><span>Rules</span>{pinned ? <span className="text-xs font-normal text-muted">Frozen when released</span> : null}</span>}>
            <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
              {sortedRules.map((r) => (
                <li key={r.rule_id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><span className="text-xs text-muted">{ruleKind(r.kind)}</span> <span className="font-medium">{r.name}</span></span>
                    <Badge tone={resultTone(r.result)}>{r.result}</Badge>
                  </div>
                  {r.result !== "not met" ? <div className="mt-1"><Evidence nodes={parseEvidence(r.evidence)} /></div> : null}
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2 text-xs text-muted">
              <Link className="underline decoration-line underline-offset-2 hover:decoration-ink" href="/rules">How the rules are defined</Link>
            </div>
          </Panel>

          <Panel title="Amounts">
            <form action={setAmounts} className="grid grid-cols-2 gap-3 px-4 py-3">
              <input type="hidden" name="return_id" value={id} />
              <label className="text-sm">Calculated<input name="calculated" defaultValue={ret.calculated ?? ""} className="field num mt-1 w-full" inputMode="decimal" /></label>
              <label className="text-sm">Collected<input name="collected" defaultValue={ret.collected ?? ""} className="field num mt-1 w-full" inputMode="decimal" /></label>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted">Gap {money(ret.gap)}</span>
                <span className="flex gap-2">
                  <button formAction={reevaluate} className="btn">Re-check rules</button>
                  <button className="btn btn-primary" disabled={pinned} title={pinned ? "Released returns keep their amounts" : undefined}>Save amounts</button>
                </span>
              </div>
            </form>
          </Panel>

          <Panel title="Issues affecting this return">
            {links.length === 0 ? <p className="px-4 py-3 text-muted">No issues.</p> : (
              <ul className="divide-y divide-line">
                {links.map((l) => l.issue && (
                  <li key={l.relation_id} className="px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{l.issue.title}</span>
                      {l.issue.priority ? <Badge tone={l.issue.priority === "P1" ? "bad" : l.issue.priority === "P2" ? "warn" : "plain"}>{l.issue.priority}</Badge> : null}
                      <Badge tone={flagTone(l.issue.status)}>{l.issue.status === "Waiting" ? `Waiting on ${l.issue.waiting_on}` : l.issue.status}</Badge>
                    </div>
                    <div className="text-muted">{l.issue.category}{l.issue.description && l.issue.description !== l.issue.title ? ` · ${l.issue.description}` : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
