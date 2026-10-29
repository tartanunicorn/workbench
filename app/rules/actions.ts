"use server";
import { revalidatePath } from "next/cache";
import { db, must } from "@/lib/db";
import { currentRun } from "@/lib/lookups";
import { tunable } from "@/lib/evidence";

// Every change to a rule re-checks the open run straight away, so its effect shows on the next screen.
async function recheck() {
  const run = await currentRun();
  if (run?.run_id) must(await db().rpc("evaluate_run", { p_run: run.run_id }));
  revalidatePath("/", "layout");
}

export async function setThreshold(form: FormData) {
  const id = String(form.get("rule_id") ?? "");
  const value = Number(String(form.get("value") ?? "").replace(/,/g, ""));
  if (!Number.isFinite(value)) throw new Error("The threshold must be a number");
  const [rule] = must(await db().from("rules").select("expression").eq("rule_id", id).eq("kind", "Condition"));
  const t = tunable(rule?.expression);
  if (!t) throw new Error("Only a single comparison against a number can be changed here");
  must(await db().from("rules").update({ expression: { ...t, value } }).eq("rule_id", id).select("rule_id"));
  await recheck();
}

export async function setActive(form: FormData) {
  const id = String(form.get("rule_id") ?? "");
  must(await db().from("rules").update({ active: form.get("active") === "true" }).eq("rule_id", id).neq("kind", "Condition").select("rule_id"));
  await recheck();
}
