"use server";
import { revalidatePath } from "next/cache";
import { db, must } from "@/lib/db";

function amount(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Not an amount: ${s}`);
  return n;
}

// Changing the amounts re-runs the rules in the database (a trigger), so tier, flags and checklist follow at once.
export async function setAmounts(form: FormData) {
  const id = String(form.get("return_id") ?? "");
  must(await db().from("returns").update({ calculated: amount(form.get("calculated")), collected: amount(form.get("collected")) })
    .eq("return_id", id).select("return_id"));
  revalidatePath(`/returns/${id}`);
}

export async function reevaluate(form: FormData) {
  const id = String(form.get("return_id") ?? "");
  must(await db().rpc("evaluate_return", { p_return: id }));
  revalidatePath(`/returns/${id}`);
}
