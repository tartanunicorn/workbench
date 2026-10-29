import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { team } from "@/lib/lookups";
import { Badge, PageHead, Panel, Stat } from "@/components/ui";
import { Choice, Field, Fold } from "@/components/form";
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
      <div className="mb-2 text-sm text-muted"><Link className="hover:underline" href="/customers">Customers</Link> / <span className="font-mono">{id}</span></div>
      <PageHead title={c.name} sub={c.notes ?? undefined}>
        <Badge tone={c.status === "Active" ? "good" : "plain"}>{c.status}</Badge>
        {c.internal_review ? <Badge tone="warn">Internal review</Badge> : null}
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Registrations" value={row.registrations ?? 0} />
        <Stat label="Setup tasks open" value={row.setup_open ?? 0} tone={row.setup_open ? "warn" : undefined} />
        <Stat label="Open issues" value={row.open_issues ?? 0} tone={row.open_issues ? "bad" : undefined} />
        <Stat label="Release owner" value={<span className="text-base">{row.release_owner ?? "None"}</span>} />
        <Stat label="Customer approver" value={<span className="text-base">{row.customer_approver ?? "None"}</span>} />
      </div>

      <div className="mb-4">
        <Fold title="Edit customer">
          <form action={updateCustomer} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="customer_id" value={id} />
            <Field label="Name"><input name="name" defaultValue={c.name} required className="field" /></Field>
            <Field label="Status"><Choice name="status" options={STATUSES} value={c.status} /></Field>
            <Field label="Customer tier"><input name="tier" defaultValue={c.tier ?? ""} className="field" /></Field>
            <Field label="Release owner"><Choice name="release_owner" options={owners} value={c.release_owner} empty="None" /></Field>
            <Field label="Customer approver"><Choice name="customer_approver" options={owners} value={c.customer_approver} empty="None" /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="internal_review" defaultChecked={c.internal_review} /> Needs internal review</label>
            <Field label="Notes" wide><input name="notes" defaultValue={c.notes ?? ""} className="field" /></Field>
            <div className="sm:col-span-3"><button className="btn btn-primary">Save</button></div>
          </form>
        </Fold>
      </div>

      <div className="grid gap-4">
        <Panel title={<span className="flex flex-wrap justify-between gap-2"><span>Registrations</span>
          <Link href="/registration-types" className="text-xs font-normal text-muted underline decoration-line underline-offset-2 hover:decoration-ink">Register to another type</Link></span>}>
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
