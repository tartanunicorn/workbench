"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui-kit/button";
import { Checkbox } from "@/components/ui-kit/checkbox";
import { Input } from "@/components/ui-kit/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui-kit/tabs";
import { Textarea } from "@/components/ui-kit/textarea";
import { registerCustomers, type RegisterResult, type RegisterRow } from "@/app/setup/actions";

type Customer = { customer_id: string; name: string; status: string };

// Lines like "C001, ****1234, 2026-12-01" or "Customer 1	****1234": a customer (id or exact name), then an optional
// account number and start date, split by commas or tabs (so a block copied from a spreadsheet works)
export function parsePasted(text: string, customers: Customer[], defaultFrom: string): { rows: RegisterRow[]; unknown: string[] } {
  const byId = new Map(customers.map((c) => [c.customer_id.toLowerCase(), c]));
  const byName = new Map(customers.map((c) => [c.name.toLowerCase(), c]));
  const rows: RegisterRow[] = []; const unknown: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/\t|,/).map((p) => p.trim());
    if (!parts[0]) continue;
    const c = byId.get(parts[0].toLowerCase()) ?? byName.get(parts[0].toLowerCase());
    if (!c) { unknown.push(parts[0]); continue; }
    const date = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
    const account = parts.slice(1).find((p) => p && p !== date);
    rows.push({ customer_id: c.customer_id, account_ref: account, active_from: date ?? defaultFrom });
  }
  return { rows, unknown };
}

export function RegisterCustomers({ typeId, typeName, customers, registered, defaultFrom }: {
  typeId: string; typeName: string; customers: Customer[]; registered: string[]; defaultFrom: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"pick" | "paste">("pick");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(defaultFrom);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const already = useMemo(() => new Set(registered), [registered]);

  const shown = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.customer_id.toLowerCase().includes(q.toLowerCase()));
  const parsed = mode === "paste" ? parsePasted(pasted, customers, from) : null;
  const rows: RegisterRow[] = mode === "pick" ? [...picked].map((id) => ({ customer_id: id, active_from: from })) : parsed!.rows;

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const go = () => start(async () => {
    setError(null); setResult(null);
    try {
      const r = await registerCustomers(typeId, rows);
      setResult(r);
      toast.success(`Registered ${r.created.length} to ${typeName}`, { description: r.tasks ? `${r.tasks} setup ${r.tasks === 1 ? "task" : "tasks"} added` : undefined });
      setPicked(new Set()); setPasted(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "pick" | "paste")}>
          <TabsList>
            <TabsTrigger value="pick">Pick customers</TabsTrigger>
            <TabsTrigger value="paste">Paste a list</TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium leading-none">Registered from</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" /></label>
      </div>

      {mode === "pick" ? (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a customer" className="w-72 max-w-full" />
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {shown.map((c) => (
              <label key={c.customer_id} className={`flex items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 ${already.has(c.customer_id) ? "text-muted-foreground" : "hover:bg-muted"}`}>
                <Checkbox checked={picked.has(c.customer_id)} onCheckedChange={() => toggle(c.customer_id)} disabled={already.has(c.customer_id)} />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.customer_id}</span>
                {already.has(c.customer_id) ? <span className="text-xs">already registered</span> : null}
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} className="font-mono text-xs"
            placeholder={"One customer per line: customer ID or name, then account number and start date if you have them\nC001, ****4486, 2026-12-01\nCustomer 7\t****1203"} />
          {parsed && parsed.unknown.length ? <div className="text-sm text-bad">Not found: {parsed.unknown.join(", ")}</div> : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || rows.length === 0} onClick={go}>
          {busy ? "Registering…" : `Register ${rows.length || ""} ${rows.length === 1 ? "customer" : "customers"} to ${typeName}`}
        </Button>
        <span className="text-xs text-muted-foreground">Anyone without an account number gets a setup task to collect their portal login.</span>
      </div>
      {error ? <div className="rounded-md border border-bad bg-bad-bg px-3 py-2 text-sm text-bad">{error}</div> : null}
      {result ? (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm">
          Registered {result.created.length}. {result.tasks ? `${result.tasks} setup ${result.tasks === 1 ? "task" : "tasks"} added. ` : ""}
          {result.skipped.length ? <>Skipped: {result.skipped.map((s) => `${s.name ?? s.customer_id} (${s.why})`).join("; ")}.</> : null}
        </div>
      ) : null}
    </div>
  );
}
