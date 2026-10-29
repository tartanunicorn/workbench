// Filters live in the URL, so every view is a link someone can send.
export type Search = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 50;

export function one(sp: Search, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim() : undefined;
}

export function page(sp: Search): { page: number; from: number; to: number } {
  const n = Math.max(1, Number.parseInt(one(sp, "page") ?? "1", 10) || 1);
  const from = (n - 1) * PAGE_SIZE;
  return { page: n, from, to: from + PAGE_SIZE - 1 };
}

// The same URL with some keys changed; a change to any filter goes back to page 1.
export function withParams(path: string, sp: Search, changes: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) q.set(k, s);
  }
  if (!("page" in changes)) q.delete("page");
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === "") q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

// PostgREST's or= and ilike= use commas, parentheses and * as syntax, so a search box can't pass them through.
export function searchTerm(s: string | undefined): string | undefined {
  const t = s?.replace(/[,()*%\\]/g, " ").trim();
  return t ? t : undefined;
}
