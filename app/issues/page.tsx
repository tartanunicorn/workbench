import Link from "next/link";
import { db, must } from "@/lib/db";
import { one, type Search } from "@/lib/params";
import { day } from "@/lib/format";
import { Badge, Empty, PageHead, TableBox } from "@/components/ui";
import { Filters, Select } from "@/components/filters";

export const dynamic = "force-dynamic";

const STATUSES = ["Open", "Waiting on customer", "Waiting on eng", "Resolved", "Won't fix"];

export default async function IssuesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = one(sp, "status") ?? "unresolved", severity = one(sp, "severity");
  let q = db().from("issues")
    .select("issue_id, category, severity, status, opened_on, due_by, description, detected_by, resolution, issue_links(return_id, registration_id, customer_id, deleted_at)")
    .is("deleted_at", null);
  if (status === "unresolved") q = q.not("status", "in", '("Resolved","Won\'t fix")');
  else if (status !== "any") q = q.eq("status", status);
  if (severity) q = q.eq("severity", severity);
  const rows = must(await q.order("severity").order("opened_on", { ascending: false }));

  return (
    <>
      <PageHead title="Issues" sub="Problems that block or put returns at risk. A return with an open issue is tier A until it's resolved." />
      <Filters>
        <Select name="status" value={status === "unresolved" ? undefined : status} all="Not resolved" options={[...STATUSES, ["any", "Any status"] as const]} />
        <Select name="severity" value={severity} all="Any severity" options={["S1", "S2", "S3"]} />
      </Filters>
      <TableBox>
        {rows.length === 0 ? <Empty>No issues match.</Empty> : (
          <table className="grid-table">
            <thead><tr><th>Issue</th><th>Severity</th><th>Status</th><th>Opened</th><th>Due</th><th>Affects</th></tr></thead>
            <tbody>
              {rows.map((i) => {
                const links = i.issue_links.filter((l) => !l.deleted_at);
                return (
                  <tr key={i.issue_id}>
                    <td className="min-w-72">
                      <div className="font-medium">{i.category}</div>
                      <div className="text-sm text-muted">{i.description}</div>
                      {i.resolution ? <div className="text-sm text-good">{i.resolution}</div> : null}
                    </td>
                    <td><Badge tone={i.severity === "S1" ? "bad" : i.severity === "S2" ? "warn" : "plain"}>{i.severity}</Badge></td>
                    <td className="whitespace-nowrap"><Badge tone={i.status === "Resolved" ? "good" : i.status?.startsWith("Waiting") ? "info" : "plain"}>{i.status}</Badge></td>
                    <td className="num whitespace-nowrap">{day(i.opened_on)}</td>
                    <td className="num whitespace-nowrap">{day(i.due_by)}</td>
                    <td className="text-sm">
                      {links.map((l, n) => l.return_id
                        ? <Link key={n} className="mr-2 text-accent hover:underline" href={`/returns/${l.return_id}`}>{l.return_id}</Link>
                        : <span key={n} className="mr-2 text-muted">{l.registration_id ?? l.customer_id}</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableBox>
    </>
  );
}
