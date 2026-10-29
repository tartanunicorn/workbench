import { team } from "@/lib/lookups";
import { PageHead } from "@/components/ui";
import { Choice, Field, Fold } from "@/components/form";
import { CustomersGrid } from "@/components/grids/setup-grids";
import { createCustomer } from "@/app/setup/actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const people = (await team()).map((o) => [o.owner_id, o.name] as const);
  return (
    <>
      <PageHead title="Customers" sub="Everyone we file for. Open a customer to see their registrations, setup tasks and issues." />
      <div className="mb-3">
        <Fold title="New customer">
          <form action={createCustomer} className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input name="name" required className="field" /></Field>
            <Field label="Org ID"><input name="org_id" className="field" /></Field>
            <Field label="Customer tier"><input name="tier" className="field" placeholder="e.g. Enterprise" /></Field>
            <Field label="Release owner"><Choice name="release_owner" options={people} empty="None yet" /></Field>
            <Field label="Customer approver"><Choice name="customer_approver" options={people} empty="None yet" /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="internal_review" /> Needs internal review</label>
            <div className="sm:col-span-3"><button className="btn btn-primary">Create customer</button></div>
          </form>
        </Fold>
      </div>
      <CustomersGrid />
    </>
  );
}
