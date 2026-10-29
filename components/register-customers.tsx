"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
    try { setResult(await registerCustomers(typeId, rows)); setPicked(new Set()); setPasted(""); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded border border-line text-sm">
          {(["pick", "paste"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 ${mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
              {m === "pick" ? "Pick customers" : "Paste a list"}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted">Registered from</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field" /></label>
      </div>

      {mode === "pick" ? (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a customer" className="field w-72 max-w-full" />
          <div className="max-h-64 overflow-y-auto rounded border border-line">
            {shown.map((c) => (
              <label key={c.customer_id} className={`flex items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-0 ${already.has(c.customer_id) ? "text-muted" : "hover:bg-soft"}`}>
                <input type="checkbox" checked={picked.has(c.customer_id)} onChange={() => toggle(c.customer_id)} disabled={already.has(c.customer_id)} />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs text-muted">{c.customer_id}</span>
                {already.has(c.customer_id) ? <span className="text-xs">already registered</span> : null}
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} className="field font-mono text-xs"
            placeholder={"One customer per line: customer ID or name, then account number and start date if you have them\nC001, ****4486, 2026-12-01\nCustomer 7\t****1203"} />
          {parsed && parsed.unknown.length ? <div className="text-sm text-bad">Not found: {parsed.unknown.join(", ")}</div> : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={busy || rows.length === 0} onClick={go}>
          {busy ? "Registering…" : `Register ${rows.length || ""} ${rows.length === 1 ? "customer" : "customers"} to ${typeName}`}
        </button>
        <span className="text-xs text-muted">Anyone without an account number gets a setup task to collect their portal login.</span>
      </div>
      {error ? <div className="rounded border border-bad bg-bad-bg px-3 py-2 text-sm text-bad">{error}</div> : null}
      {result ? (
        <div className="rounded border border-line bg-soft px-3 py-2 text-sm">
          Registered {result.created.length}. {result.tasks ? `${result.tasks} setup ${result.tasks === 1 ? "task" : "tasks"} added. ` : ""}
          {result.skipped.length ? <>Skipped: {result.skipped.map((s) => `${s.name ?? s.customer_id} (${s.why})`).join("; ")}.</> : null}
        </div>
      ) : null}
    </div>
  );
}
