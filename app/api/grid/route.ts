import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GRIDS, checkScope, filterTree, order, searchTree, type GridRequest } from "@/lib/grid";

const MAX_BLOCK = 500;

// One block of rows for a grid: the page's fixed scope, the user's column filters and quick search, sorted in the database
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GridRequest;
    const spec = GRIDS[body.grid];
    if (!spec) return NextResponse.json({ error: "Unknown grid" }, { status: 400 });
    const start = Math.max(0, Math.floor(body.startRow ?? 0));
    const end = Math.min(start + MAX_BLOCK, Math.max(start, Math.floor(body.endRow ?? start + 100)));

    let q = db().from(spec.view).select("*", { count: "exact" });
    for (const s of checkScope(spec, body.scope)) {
      if (s.op === "eq") q = q.eq(s.field, s.value as string);
      else if (s.op === "in") q = q.in(s.field, s.value as string[]);
      else q = q.not(s.field, "in", `(${(s.value as string[]).map((v) => `"${v}"`).join(",")})`);
    }
    const tree = filterTree(spec, body.filterModel);
    const search = searchTree(spec, body.q);
    const both = [tree, search].filter(Boolean) as string[];
    if (both.length) q = q.or(both.length === 1 ? both[0] : `and(${both.join(",")})`);
    for (const o of order(spec, body.sortModel)) q = q.order(o.field, { ascending: o.asc, nullsFirst: false });

    const res = await q.range(start, end - 1);
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });
    return NextResponse.json({ rows: res.data, total: res.count ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
