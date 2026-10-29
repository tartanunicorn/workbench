import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { customerList, ownerName, owners, registrationTypeList, runs } from "@/lib/lookups";
import { day } from "@/lib/format";
import { AUTOMATION, DUE_RULES, RULE_FIELD } from "@/lib/words";
import { PageHead, Panel, Stat } from "@/components/ui";
import { Choice, Field, Fold } from "@/components/form";
import { RegistrationsGrid } from "@/components/grids/setup-grids";
import { RegisterCustomers } from "@/components/register-customers";
import { addTypeRule, copyTemplate } from "@/app/setup/actions";

export const dynamic = "force-dynamic";

const ANCHOR: Record<string, string> = { BD: "business day", CD: "calendar day", DUE: "days from due date" };
function when(anchor: string | null, offset: number | null) {
  if (!anchor || offset === null) return "";
  return anchor === "DUE" ? `${offset >= 0 ? "+" : ""}${offset} ${ANCHOR.DUE}` : `${ANCHOR[anchor]} ${offset}`;
}

export default async function RegistrationTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[t], [row], rules, template, regs, people, allCustomers, types, allRuns] = await Promise.all([
    db().from("registration_types").select("*").eq("registration_type_id", id).is("deleted_at", null).then(must),
    db().from("registration_type_grid").select("*").eq("registration_type_id", id).then(must),
    db().from("registration_type_rules").select("rule_id, field, value, valid_from, notes").eq("registration_type_id", id).is("deleted_at", null)
      .order("field").order("valid_from", { ascending: false }).then(must),
    db().from("tasks").select("task_id, title, anchor, offset, completes_stage, applies_to_tier, owner_role")
      .eq("registration_type_id", id).eq("status", "Template").is("deleted_at", null).order("completes_stage").then(must),
    db().from("registrations").select("customer_id").eq("registration_type_id", id).is("deleted_at", null).is("active_to", null).then(must),
    owners(), customerList(), registrationTypeList(), runs(),
  ]);
  if (!t || !row) notFound();
  const ownerChoices = [...people.values()].filter((o) => o.type !== "External" && o.active).map((o) => [o.owner_id, o.name] as const);
  const value = (field: string, v: string | null) => (field.startsWith("default_") ? ownerName(people, v) || v : v);
  const nextRun = allRuns[0]?.run_month;
  const defaultFrom = nextRun ? new Date(Date.parse(nextRun) + 40 * 86_400_000).toISOString().slice(0, 8) + "01" : new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-2 text-sm text-muted"><Link className="hover:underline" href="/registration-types">Registration types</Link> / <span className="font-mono">{id}</span></div>
      <PageHead title={t.name} sub={`${t.region_code ?? t.country_code} · ${t.tax_type} · ${t.frequency} · ${t.workflow} workflow`} />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Customers" value={row.customers ?? 0} />
        <Stat label="Tasks per return" value={row.template_tasks ?? 0} tone={row.template_tasks ? undefined : "warn"} />
        <Stat label="Due" value={<span className="text-base">{row.due_rule ? `${row.due_rule}${row.due_value ? ` (${row.due_value})` : ""}` : "Not set"}</span>} />
        <Stat label="Automation" value={<span className="text-base">{row.automation ?? "Not set"}</span>} />
        <Stat label="Default preparer" value={<span className="text-base">{row.default_preparer ?? "None"}</span>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Register customers">
          <div className="p-4">
            <RegisterCustomers typeId={id} typeName={t.name} customers={allCustomers} registered={regs.map((r) => r.customer_id)} defaultFrom={defaultFrom} />
          </div>
        </Panel>

        <Panel title="Rules, by the date they start">
          <div className="max-h-72 overflow-y-auto">
            <table className="grid-table">
              <thead><tr><th>Rule</th><th>Value</th><th>From</th><th>Notes</th></tr></thead>
              <tbody>
                {rules.length === 0 ? <tr><td colSpan={4} className="text-muted">No rules yet.</td></tr> : rules.map((r) => (
                  <tr key={r.rule_id}>
                    <td className="whitespace-nowrap">{RULE_FIELD[r.field] ?? r.field}</td>
                    <td>{value(r.field, r.value)}</td>
                    <td className="num whitespace-nowrap">{r.valid_from <= "2000-12-31" ? "Always" : day(r.valid_from)}</td>
                    <td className="text-muted">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line p-3">
            <Fold title="Change a rule from a date">
              <form action={addTypeRule} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="registration_type_id" value={id} />
                <Field label="Rule"><Choice name="field" options={Object.entries(RULE_FIELD)} /></Field>
                <Field label="New value" hint={`Due: ${DUE_RULES.join(" or ")}. Automation: ${AUTOMATION.join(", ")}. Owners: an owner ID.`}>
                  <input name="value" className="field" list="rule-values" />
                </Field>
                <datalist id="rule-values">{[...DUE_RULES, ...AUTOMATION, ...ownerChoices.map(([v]) => v)].map((v) => <option key={v} value={v} />)}</datalist>
                <Field label="From" hint="Periods ending on or after this date use it; earlier ones keep the old value"><input type="date" name="valid_from" required className="field" /></Field>
                <Field label="Why"><input name="notes" className="field" /></Field>
                <div className="sm:col-span-2"><button className="btn btn-primary">Save rule change</button></div>
              </form>
            </Fold>
          </div>
        </Panel>

        <Panel title="Tasks every return of this type gets">
          {template.length === 0 ? (
            <form action={copyTemplate} className="flex flex-wrap items-end gap-3 p-4">
              <input type="hidden" name="registration_type_id" value={id} />
              <Field label="No tasks yet. Copy them from"><Choice name="copy_from" options={types.filter((x) => x.registration_type_id !== id).map((x) => [x.registration_type_id, x.name] as const)} empty="Pick a type" required /></Field>
              <button className="btn btn-primary">Copy tasks</button>
            </form>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="grid-table">
                <thead><tr><th>Task</th><th>Due</th><th>Stage</th><th>Owner</th><th>Tier</th></tr></thead>
                <tbody>
                  {template.map((k) => (
                    <tr key={k.task_id}>
                      <td>{k.title}</td>
                      <td className="whitespace-nowrap text-muted">{when(k.anchor, k.offset)}</td>
                      <td className="num">{k.completes_stage}</td>
                      <td className="whitespace-nowrap">{k.owner_role}</td>
                      <td>{k.applies_to_tier === "A" ? "Tier A only" : "All"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Customers registered">
          <div className="p-3"><RegistrationsGrid by="type" scope={[{ field: "registration_type_id", op: "eq", value: id }]} height="320px" /></div>
        </Panel>
      </div>
    </>
  );
}
