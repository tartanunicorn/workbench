import { team } from "@/lib/lookups";
import { PageHead } from "@/components/ui";
import { Check, Choice, Field, FormDialog, Input, Submit } from "@/components/form";
import { CustomersGrid } from "@/components/grids/setup-grids";
import { createCustomer } from "@/app/setup/actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const people = (await team()).map((o) => [o.owner_id, o.name] as const);
  return (
    <>
      <PageHead title="Customers" sub="Everyone we file for. Open a customer to see their registrations, setup tasks and issues.">
        <FormDialog label="New customer" description="Register them to a registration type next, from the type's page." wide>
          <form action={createCustomer} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" wide><Input name="name" required /></Field>
            <Field label="Org ID"><Input name="org_id" /></Field>
            <Field label="Customer tier"><Input name="tier" placeholder="e.g. Enterprise" /></Field>
            <Field label="Release owner"><Choice name="release_owner" options={people} empty="None yet" /></Field>
            <Field label="Customer approver"><Choice name="customer_approver" options={people} empty="None yet" /></Field>
            <Check name="internal_review" label="Needs internal review" className="sm:col-span-2" />
            <div className="flex justify-end sm:col-span-2"><Submit>Create customer</Submit></div>
          </form>
        </FormDialog>
      </PageHead>
      <CustomersGrid />
    </>
  );
}
