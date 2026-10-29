import { countries, regions, registrationTypeList, team } from "@/lib/lookups";
import { PageHead } from "@/components/ui";
import { Choice, Field, FormDialog, Input, Submit } from "@/components/form";
import { RegistrationTypesGrid } from "@/components/grids/setup-grids";
import { createRegistrationType } from "@/app/setup/actions";
import { AUTOMATION, DUE_RULES, FREQUENCIES, TAX_TYPES, WORKFLOWS } from "@/lib/words";

export const dynamic = "force-dynamic";

export default async function RegistrationTypesPage() {
  const [cs, rs, types, people] = await Promise.all([countries(), regions(), registrationTypeList(), team()]);
  const owners = people.map((o) => [o.owner_id, o.name] as const);
  return (
    <>
      <PageHead title="Registration types" sub="What customers are registered to: a place, tax type and frequency, with its due rules and the tasks every return of the type gets." >
        <FormDialog label="New registration type" description="Rules and tasks can change later, from a date." wide>
            <form action={createRegistrationType} className="grid gap-3 sm:grid-cols-3">
              <Field label="Country"><Choice name="country_code" options={cs.map((c) => [c.country_code, `${c.name} (${c.country_code})`] as const)} empty="Pick one" required /></Field>
              <Field label="Region" hint="Leave empty for a national registration"><Choice name="region_code" options={rs.map((r) => [r.region_code, `${r.region_code} ${r.name}`] as const)} empty="None" /></Field>
              <Field label="Tax type"><Choice name="tax_type" options={TAX_TYPES} empty="Pick one" required /></Field>
              <Field label="Frequency"><Choice name="frequency" options={FREQUENCIES} empty="Pick one" required /></Field>
              <Field label="Workflow"><Choice name="workflow" options={WORKFLOWS} value="Standard" /></Field>
              <Field label="Name" hint="Leave empty for e.g. US-TX Sales · Monthly"><Input name="name" /></Field>
              <Field label="Due"><Choice name="due_rule" options={DUE_RULES} empty="Not set" /></Field>
              <Field label="Due day or days"><Input name="due_value" inputMode="numeric" placeholder="e.g. 20" /></Field>
              <Field label="Automation"><Choice name="automation" options={AUTOMATION} empty="Not set" /></Field>
              <Field label="Default preparer"><Choice name="default_preparer" options={owners} empty="None" /></Field>
              <Field label="Default reviewer"><Choice name="default_reviewer" options={owners} empty="None" /></Field>
              <Field label="Rules apply from" hint="Periods ending on or after this date"><Input type="date" name="valid_from" /></Field>
              <Field label="Start its tasks from" hint="Copies another type's tasks" wide><Choice name="copy_from" options={types.map((t) => [t.registration_type_id, t.name] as const)} empty="No tasks yet" /></Field>
              <div className="flex justify-end sm:col-span-3"><Submit>Create registration type</Submit></div>
            </form>
        </FormDialog>
      </PageHead>
      <RegistrationTypesGrid />
    </>
  );
}
