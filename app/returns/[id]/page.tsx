import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { ownerName, owners } from "@/lib/lookups";
import { day, money } from "@/lib/format";
import { parseEvidence } from "@/lib/evidence";
import { Badge, PageHead, Panel, Stat, flagTone } from "@/components/ui";
import { Evidence, resultTone } from "@/components/evidence";
import { TaskStatus } from "@/components/task-status";
import { reevaluate, setAmounts } from "../actions";

export const dynamic = "force-dynamic";

const KIND_ORDER = ["Tier A", "Include step", "Leave out step", "Flag"];

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ret] = must(await db().from("return_board").select("*").eq("return_id", id));
  if (!ret) notFound();

  const [steps, rules, events, links, people] = await Promise.all([
    db().from("task_board").select("task_id, title, status, due_date, due_flag, owner_id, completes_stage, blocked_by, notes")
      .eq("parent_id", ret.header_task_id ?? "").order("completes_stage").order("due_date").then(must),
    db().from("return_rules").select("*").eq("return_id", id).order("rule_id").then(must),
    db().from("return_events").select("event_id, at, from_stage, to_stage, from_state, to_state, actor, source, note")
      .eq("return_id", id).is("deleted_at", null).order("at", { ascending: false }).limit(30).then(must),
    db().from("issue_links").select("issue_id, issues(issue_id, category, severity, status, description, due_by)")
      .eq("return_id", id).is("deleted_at", null).then(must),
    owners(),
  ]);
  const sortedRules = [...rules].sort((a, b) => KIND_ORDER.indexOf(a.kind ?? "") - KIND_ORDER.indexOf(b.kind ?? ""));
  const pinned = rules.some((r) => r.pinned);

  return (
    <>
      <div className="mb-2 text-sm text-muted">
        <Link className="hover:underline" href={`/returns?run=${ret.run_id}`}>Returns</Link> / {ret.return_id}
      </div>
      <PageHead title={ret.customer_name ?? id}
        sub={<>{ret.type_name} · {ret.place_code} · {ret.frequency} · period {day(ret.period_start)} – {day(ret.period_end)}{ret.kind !== "Regular" ? ` · ${ret.kind}` : ""}</>}>
        <Badge tone={flagTone(ret.flag)}>{ret.flag}</Badge>
        <Badge tone={ret.tier === "A" ? "warn" : ret.tier === "?" ? "info" : "plain"}>Tier {ret.tier}</Badge>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Stage" value={ret.stage_n ?? ""} />
        <Stat label="Steps done" value={`${ret.steps_done}/${ret.steps_total}`} />
        <Stat label="Release by" value={day(ret.release_by)} />
        <Stat label="Submit by" value={day(ret.submit_due)} />
        <Stat label="Preparer" value={<span className="text-base">{ownerName(people, ret.preparer) || "—"}</span>} />
        <Stat label="Reviewer" value={<span className="text-base">{ownerName(people, ret.reviewer) || "—"}</span>} />
      </div>

      {ret.rule_flags?.length ? (
        <div className="mb-4 rounded-lg border border-warn bg-warn-bg px-4 py-2.5 text-warn">{ret.rule_flags.join(" · ")}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title="Checklist">
            <ul className="divide-y divide-line">
              {steps.map((s) => (
                <li key={s.task_id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className={s.status === "Skipped" ? "text-muted line-through" : "font-medium"}>{s.title}</div>
                    <div className="text-xs text-muted">
                      Stage {s.completes_stage} · {ownerName(people, s.owner_id) || "Unassigned"} · due {day(s.due_date)}
                      {s.blocked_by?.length ? <span className="text-bad"> · blocked by {s.blocked_by.join(", ")}</span> : null}
                    </div>
                    {s.notes ? <div className="text-xs text-muted">{s.notes}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={flagTone(s.status === "Not started" || s.status === "In progress" ? s.due_flag : s.status)}>
                      {s.status === "Not started" || s.status === "In progress" ? `${s.status} · ${s.due_flag}` : s.status}
                    </Badge>
                    <TaskStatus id={s.task_id!} status={s.status} blocked={!!s.blocked_by?.length} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="History">
            {events.length === 0 ? <p className="px-4 py-3 text-muted">No changes yet.</p> : (
              <ul className="divide-y divide-line">
                {events.map((e) => (
                  <li key={e.event_id} className="px-4 py-2 text-sm">
                    <span className="num text-muted">{day(e.at)}</span>{" "}
                    {e.from_stage !== e.to_stage && e.to_stage ? <>{e.from_stage ?? "—"} → <span className="font-medium">{e.to_stage}</span></> : null}
                    {e.from_state !== e.to_state && e.to_state ? <> state {e.from_state ?? "—"} → <span className="font-medium">{e.to_state}</span></> : null}
                    <span className="text-muted"> · {ownerName(people, e.actor) || e.source}</span>
                    {e.note ? <div className="text-muted">{e.note}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title={<span className="flex justify-between gap-2"><span>Why: the rules</span>{pinned ? <span className="text-xs font-normal text-muted">Frozen at release</span> : null}</span>}>
            <ul className="divide-y divide-line">
              {sortedRules.map((r) => (
                <li key={r.rule_id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><span className="text-xs text-muted">{r.kind}</span> <span className="font-medium">{r.name}</span></span>
                    <Badge tone={resultTone(r.result)}>{r.result}</Badge>
                  </div>
                  {r.result !== "not met" ? <div className="mt-1"><Evidence nodes={parseEvidence(r.evidence)} /></div> : null}
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2 text-xs text-muted">
              <Link className="text-accent hover:underline" href="/rules">How the rules are defined</Link>
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
                  <button className="btn btn-primary" disabled={pinned}>Save amounts</button>
                </span>
              </div>
            </form>
          </Panel>

          <Panel title="Issues">
            {links.length === 0 ? <p className="px-4 py-3 text-muted">No issues linked.</p> : (
              <ul className="divide-y divide-line">
                {links.map((l) => l.issues && (
                  <li key={l.issue_id} className="px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{l.issues.category}</span>
                      <Badge tone={l.issues.severity === "S1" ? "bad" : "warn"}>{l.issues.severity}</Badge>
                      <Badge tone={l.issues.status === "Resolved" ? "good" : "plain"}>{l.issues.status}</Badge>
                    </div>
                    <div className="text-muted">{l.issues.description}</div>
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
