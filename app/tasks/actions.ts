"use server";
import { revalidatePath } from "next/cache";
import { db, must } from "@/lib/db";

const STATUSES = ["Not started", "In progress", "Done", "Skipped"] as const;

// Ticking a step is the one write most people make. The database does the rest:
// it stamps done_on, moves the return's stage and logs the event.
export async function setTaskStatus(form: FormData) {
  const id = String(form.get("task_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error("Unknown task or status");

  if (status === "Done") {
    const [t] = must(await db().from("task_board").select("blocked_by").eq("task_id", id));
    if (t?.blocked_by?.length) throw new Error(`Blocked by ${t.blocked_by.join(", ")}`);
  }
  must(await db().from("tasks").update({ status }).eq("task_id", id).select("task_id"));
  revalidatePath("/tasks");
  revalidatePath("/returns", "layout");
  revalidatePath("/runs", "layout");
}
