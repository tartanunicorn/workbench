"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";

// Creates next month's run, its returns, owners and checklists, then lets the rules decide which steps stay in.
export async function kickOff(form: FormData) {
  if (form.get("confirm") !== "yes") throw new Error("Tick the box to confirm");
  const res = must(await db().rpc("kick_off_and_evaluate")) as { run_id?: string } | null;
  revalidatePath("/", "layout");
  redirect(res?.run_id ? `/runs/${res.run_id}` : "/runs");
}
