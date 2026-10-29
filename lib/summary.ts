// Pure helpers that turn grouped rows into what the run page shows. Kept apart from the page so they can be tested.

export type SummaryRow = { flag: string | null; tier: string | null; stage_n: number | null; stage: string | null; returns: number | null };

// The order a lead reads flags in: what is already wrong, what is about to be, then what is fine
export const FLAG_ORDER = [
  "Missed deadline", "Late release", "Filed late", "Blocked, no issue", "Blocked", "Submit at risk",
  "Behind plan", "On hold", "Period open", "On track", "Done", "N/A",
] as const;

export function sumBy<T>(rows: T[], key: (r: T) => string | null | undefined, n: (r: T) => number | null | undefined) {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) ?? "";
    out.set(k, (out.get(k) ?? 0) + (n(r) ?? 0));
  }
  return out;
}

export function byFlag(rows: SummaryRow[]): [string, number][] {
  const m = sumBy(rows, (r) => r.flag, (r) => r.returns);
  const rank = (f: string) => { const i = (FLAG_ORDER as readonly string[]).indexOf(f); return i < 0 ? FLAG_ORDER.length : i; };
  return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

export function byStage(rows: SummaryRow[]): { stage_n: number; stage: string; returns: number }[] {
  const m = new Map<number, { stage_n: number; stage: string; returns: number }>();
  for (const r of rows) {
    if (r.stage_n == null) continue;
    const s = m.get(r.stage_n) ?? { stage_n: r.stage_n, stage: r.stage ?? String(r.stage_n), returns: 0 };
    s.returns += r.returns ?? 0;
    m.set(r.stage_n, s);
  }
  return [...m.values()].sort((a, b) => a.stage_n - b.stage_n);
}

export function total(rows: { returns: number | null }[], where: (r: SummaryRow) => boolean = () => true): number {
  return (rows as SummaryRow[]).filter(where).reduce((n, r) => n + (r.returns ?? 0), 0);
}
