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

// A return is a task; its amounts live in the task's details. Changing them re-runs the rules in the database
// (a trigger), so tier, flags and checklist follow at once. A blank amount is left out.
export async function setAmounts(form: FormData) {
  const id = String(form.get("return_id") ?? "");
  must(await db().rpc("set_return_amounts", { p_return: id, p_calculated: amount(form.get("calculated")) ?? undefined, p_collected: amount(form.get("collected")) ?? undefined }));
  revalidatePath(`/returns/${id}`);
}

export async function reevaluate(form: FormData) {
  const id = String(form.get("return_id") ?? "");
  must(await db().rpc("evaluate_return", { p_return: id }));
  revalidatePath(`/returns/${id}`);
}
