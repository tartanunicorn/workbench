import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui-kit/button";
import { db, must } from "@/lib/db";
import { team } from "@/lib/lookups";
import { Badge, PageHead, Panel, Stat } from "@/components/ui";
import { Check, Choice, Field, FormDialog, Input, Submit } from "@/components/form";
import { RegistrationsGrid } from "@/components/grids/setup-grids";
import { TasksGrid } from "@/components/grids/tasks-grid";
import { updateCustomer } from "@/app/setup/actions";

export const dynamic = "force-dynamic";

const STATUSES = ["Active", "Hold", "Offboarding", "Closed"];

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[c], [row], people] = await Promise.all([
    db().from("customers").select("*").eq("customer_id", id).is("deleted_at", null).then(must),
    db().from("customer_grid").select("*").eq("customer_id", id).then(must),
    team(),
  ]);
  if (!c || !row) notFound();
  const owners = people.map((o) => [o.owner_id, o.name] as const);

  return (
    <>
      <div className="mb-2 text-sm text-muted-foreground"><Link className="hover:underline" href="/customers">Customers</Link> / <span className="font-mono">{id}</span></div>
      <PageHead title={c.name} sub={c.notes ?? undefined}>
        <Badge tone={c.status === "Active" ? "good" : "plain"}>{c.status}</Badge>
        {c.internal_review ? <Badge tone="warn">Internal review</Badge> : null}
        <FormDialog label="Edit customer" variant="outline" wide>
          <form action={updateCustomer} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="customer_id" value={id} />
            <Field label="Name"><Input name="name" defaultValue={c.name} required /></Field>
            <Field label="Status"><Choice name="status" options={STATUSES} value={c.status} /></Field>
            <Field label="Customer tier"><Input name="tier" defaultValue={c.tier ?? ""} /></Field>
            <Field label="Release owner"><Choice name="release_owner" options={owners} value={c.release_owner} empty="None" /></Field>
            <Field label="Customer approver"><Choice name="customer_approver" options={owners} value={c.customer_approver} empty="None" /></Field>
            <Check name="internal_review" label="Needs internal review" defaultChecked={c.internal_review} className="self-end pb-2" />
            <Field label="Notes" wide><Input name="notes" defaultValue={c.notes ?? ""} /></Field>
            <div className="flex justify-end sm:col-span-2"><Submit>Save</Submit></div>
          </form>
        </FormDialog>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Registrations" value={row.registrations ?? 0} />
        <Stat label="Setup tasks open" value={row.setup_open ?? 0} tone={row.setup_open ? "warn" : undefined} />
        <Stat label="Open issues" value={row.open_issues ?? 0} tone={row.open_issues ? "bad" : undefined} />
        <Stat label="Release owner" value={<span className="text-base">{row.release_owner ?? "None"}</span>} />
        <Stat label="Customer approver" value={<span className="text-base">{row.customer_approver ?? "None"}</span>} />
      </div>

      <div className="grid gap-4">
        <Panel title="Registrations" action={
          <Button variant="outline" size="xs" asChild><Link href="/registration-types">Register to another type</Link></Button>}>
          <div className="p-3"><RegistrationsGrid by="customer" scope={[{ field: "customer_id", op: "eq", value: id }]} height="320px" /></div>
        </Panel>
        <Panel title="Setup tasks and issues">
          <div className="p-3">
            <TasksGrid scope={[{ field: "customer_id", op: "eq", value: id }]} cards={false} showParent={false} height="320px" />
          </div>
        </Panel>
      </div>
    </>
  );
}
