import type { Json } from "./database.types";

// The evaluator's evidence, as a tree a person can read: each condition, and under it the facts it compared.
export type EvidenceNode =
  | { type: "condition"; id: string; name: string; result: string; children: EvidenceNode[] }
  | { type: "fact"; measure: string; op: string; value: Json; actual: Json; result: string; why?: string }
  | { type: "error"; message: string };

export function parseEvidence(ev: Json | null | undefined): EvidenceNode[] {
  if (!Array.isArray(ev)) return [];
  return ev.flatMap((e): EvidenceNode[] => {
    if (!e || typeof e !== "object" || Array.isArray(e)) return [];
    if (typeof e.error === "string") return [{ type: "error", message: e.error }];
    if (typeof e.condition === "string")
      return [{ type: "condition", id: e.condition, name: String(e.name ?? e.condition), result: String(e.result ?? ""), children: parseEvidence(e.evidence ?? null) }];
    if (typeof e.measure === "string")
      return [{ type: "fact", measure: e.measure, op: String(e.op ?? "="), value: e.value ?? null, actual: e.actual ?? null, result: String(e.result ?? ""), why: typeof e.why === "string" ? e.why : undefined }];
    return [];
  });
}

const MEASURES: Record<string, string> = {
  gap_abs: "Gap (collected vs calculated)",
  gap_pct: "Gap as a share of calculated",
  days_registered: "Days registered at period end",
  internal_review: "Customer needs internal review",
  open_issues: "Open issues linked",
  workflow: "Workflow", kind: "Return kind", tax_type: "Tax type", frequency: "Frequency", place: "Place",
  customer_status: "Customer status", calculated: "Calculated", collected: "Collected", stage: "Stage", state: "State",
};
const OPS: Record<string, string> = { "=": "is", "!=": "is not", ">": "over", ">=": "at least", "<": "under", "<=": "at most", in: "one of" };

export function measureLabel(m: string): string { return MEASURES[m] ?? m.replace(/_/g, " "); }
export function opLabel(op: string): string { return OPS[op] ?? op; }

export function show(v: Json, measure?: string): string {
  if (v === null || v === undefined) return "not known";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return measure === "gap_pct" ? `${(v * 100).toFixed(1)}%` : v.toLocaleString("en-US");
  if (Array.isArray(v)) return v.map((x) => show(x, measure)).join(", ");
  return String(v);
}

// A condition's expression in words, naming the conditions it builds on
export function describe(e: Json | null | undefined, names: Map<string, string>): string {
  if (!e || typeof e !== "object" || Array.isArray(e)) return "";
  if (typeof e.condition === "string") return names.get(e.condition) ?? e.condition;
  if (e.not !== undefined) return `not (${describe(e.not, names)})`;
  const list = (Array.isArray(e.any) && e.any) || (Array.isArray(e.all) && e.all);
  if (list) return `${Array.isArray(e.any) ? "any of" : "all of"}: ${list.map((x) => describe(x, names)).join(", ")}`;
  if (typeof e.measure === "string") return `${measureLabel(e.measure)} ${opLabel(String(e.op ?? "="))} ${show(e.value ?? null, e.measure)}`;
  return "";
}

// A single comparison against a number is the kind of rule an ops lead tunes without help
export function tunable(e: Json | null | undefined): { measure: string; op: string; value: number } | null {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  if (typeof e.measure !== "string" || typeof e.value !== "number") return null;
  return { measure: e.measure, op: String(e.op ?? "="), value: e.value };
}
