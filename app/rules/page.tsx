import { db, must } from "@/lib/db";
import { currentRun } from "@/lib/lookups";
import { month } from "@/lib/format";
import { describe, measureLabel, opLabel, tunable } from "@/lib/evidence";
import { ruleKind } from "@/lib/words";
import { Badge, PageHead, Panel } from "@/components/ui";
import { setActive, setThreshold } from "./actions";

export const dynamic = "force-dynamic";

const EFFECTS = ["Tier A", "Include step", "Leave out step", "Flag"] as const;

export default async function RulesPage() {
  const run = await currentRun();
  const [rules, results] = await Promise.all([
    db().from("rules").select("*").is("deleted_at", null).order("rule_id").then(must),
    db().from("rule_summary").select("rule_id, result, returns").eq("run_id", run?.run_id ?? "").then(must),
  ]);
  const names = new Map(rules.map((r) => [r.rule_id, r.name]));
  const outcome = (id: string, result: string) => results.find((x) => x.rule_id === id && x.result === result)?.returns ?? 0;
  const conditions = rules.filter((r) => r.kind === "Condition");

  return (
    <>
      <PageHead title="Rules"
        sub="The workbench runs these checks on every return. Definitions say what words like large gap mean; the other rules say what happens when a definition is met. Every check comes out met, not met or can't tell, with its evidence." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Definitions: what the words mean">
          <ul className="divide-y divide-line">
            {conditions.map((c) => {
              const t = tunable(c.expression);
              return (
                <li key={c.rule_id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="font-mono text-xs text-muted">{c.rule_id}</span>
                  </div>
                  <div className="text-sm text-muted">{describe(c.expression, names)}</div>
                  {t ? (
                    <form action={setThreshold} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="rule_id" value={c.rule_id} />
                      <span>{measureLabel(t.measure)} {opLabel(t.op)}</span>
                      <input name="value" defaultValue={t.value} className="field num w-28" inputMode="decimal" aria-label={`Threshold for ${c.name}`} />
                      <button className="btn">Save and re-check</button>
                    </form>
                  ) : null}
                  {c.source ? <div className="mt-1 text-xs text-muted">Source: {c.source}</div> : null}
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4">
          {EFFECTS.map((kind) => {
            const list = rules.filter((r) => r.kind === kind);
            if (!list.length) return null;
            return (
              <Panel key={kind} title={<>{ruleKind(kind)} {run ? <span className="font-normal text-muted">· {month(run.run_month)} run</span> : null}</>}>
                <ul className="divide-y divide-line">
                  {list.map((r) => (
                    <li key={r.rule_id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className={r.active ? "font-medium" : "font-medium text-muted line-through"}>{r.name}</div>
                        <div className="text-sm text-muted">
                          When <span className="text-ink">{names.get(r.condition_id ?? "") ?? r.condition_id}</span>
                          {r.step_title ? <> · task “{r.step_title}”</> : null}
                          {r.message ? <> · “{r.message}”</> : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone="good">met {outcome(r.rule_id, "met")}</Badge>
                          <Badge>not met {outcome(r.rule_id, "not met")}</Badge>
                          {outcome(r.rule_id, "can't tell") ? <Badge tone="warn">can&apos;t tell {outcome(r.rule_id, "can't tell")}</Badge> : null}
                        </div>
                      </div>
                      <form action={setActive}>
                        <input type="hidden" name="rule_id" value={r.rule_id} />
                        <button name="active" value={r.active ? "false" : "true"} className="btn text-xs">{r.active ? "Turn off" : "Turn on"}</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}
