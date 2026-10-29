import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Demo mode: the publishable key is safe to ship, and row-level security decides what it can do.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kmldgwryhyweupekusfd.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_q_7LKmeIfX1irAf8w4keig_CA4tc1Vu";

export function db() {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export type Views = Database["public"]["Views"];
export type Tables = Database["public"]["Tables"];
export type TaskRow = Views["task_board"]["Row"];
export type ReturnRow = Views["return_board"]["Row"];
export type RuleResultRow = Views["return_rules"]["Row"];

// Every query either returns its data or throws, so a page never renders half an answer as if it were whole.
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
