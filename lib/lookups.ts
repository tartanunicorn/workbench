import { cache } from "react";
import { db, must } from "./db";

// Small lists every page needs, fetched once per request
export const runs = cache(async () =>
  must(await db().from("run_calendar").select("*").order("run_month", { ascending: false })));

export const currentRun = cache(async () => {
  const all = await runs();
  return all.find((r) => r.status === "Open") ?? all[0] ?? null;
});

export const owners = cache(async () => {
  const rows = must(await db().from("owners").select("owner_id, name, type, active").is("deleted_at", null).order("name"));
  return new Map(rows.map((o) => [o.owner_id, o]));
});

export function ownerName(map: Map<string, { name: string }>, id: string | null | undefined): string {
  if (!id) return "";
  return map.get(id)?.name ?? id;
}
