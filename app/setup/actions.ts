"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";

const text = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };
const need = (f: FormData, k: string, label: string) => { const v = text(f, k); if (!v) throw new Error(`${label} is needed`); return v; };

// ---------- customers ----------
export async function createCustomer(f: FormData) {
  const [c] = must(await db().from("customers").insert({
    name: need(f, "name", "A name"), org_id: text(f, "org_id"), tier: text(f, "tier"),
    release_owner: text(f, "release_owner"), customer_approver: text(f, "customer_approver"),
    internal_review: f.get("internal_review") === "on",
  }).select("customer_id"));
  revalidatePath("/customers");
  redirect(`/customers/${c.customer_id}`);
}

export async function updateCustomer(f: FormData) {
  const id = need(f, "customer_id", "The customer");
  must(await db().from("customers").update({
    name: need(f, "name", "A name"), tier: text(f, "tier"), status: need(f, "status", "A status"),
    release_owner: text(f, "release_owner"), customer_approver: text(f, "customer_approver"),
    internal_review: f.get("internal_review") === "on", notes: text(f, "notes"),
  }).eq("customer_id", id).select("customer_id"));
  revalidatePath(`/customers/${id}`);
}

// ---------- registration types ----------
const RULE_FIELDS = ["due_rule", "due_value", "automation", "default_preparer", "default_reviewer", "roll_forward"] as const;

export async function createRegistrationType(f: FormData) {
  const country = need(f, "country_code", "A country");
  const region = text(f, "region_code");
  const tax = need(f, "tax_type", "A tax type");
  const freq = need(f, "frequency", "A frequency");
  const name = text(f, "name") ?? `${region ?? country} ${tax} · ${freq}`;
  const [t] = must(await db().from("registration_types").insert({
    name, country_code: country, region_code: region, tax_type: tax, frequency: freq, workflow: need(f, "workflow", "A workflow"),
  }).select("registration_type_id"));
  const id = t.registration_type_id;

  const from = text(f, "valid_from") ?? "2000-01-01";
  const rules = RULE_FIELDS.map((field) => ({ field, value: text(f, field) })).filter((r) => r.value !== null)
    .map((r) => ({ registration_type_id: id, field: r.field, value: r.value, valid_from: from }));
  if (rules.length) must(await db().from("registration_type_rules").insert(rules).select("rule_id"));

  const copyFrom = text(f, "copy_from");
  if (copyFrom) must(await db().rpc("copy_template", { p_from: copyFrom, p_to: id }));
  revalidatePath("/registration-types");
  redirect(`/registration-types/${id}`);
}

// A rule change takes effect from a date; earlier periods keep the rule that was true then
export async function addTypeRule(f: FormData) {
  const id = need(f, "registration_type_id", "The registration type");
  const field = need(f, "field", "A field");
  if (!RULE_FIELDS.includes(field as (typeof RULE_FIELDS)[number])) throw new Error(`Unknown field ${field}`);
  must(await db().from("registration_type_rules").upsert({
    registration_type_id: id, field, value: text(f, "value"), valid_from: need(f, "valid_from", "A start date"), notes: text(f, "notes"),
  }, { onConflict: "registration_type_id,field,valid_from" }).select("rule_id"));
  revalidatePath(`/registration-types/${id}`);
}

export async function copyTemplate(f: FormData) {
  const id = need(f, "registration_type_id", "The registration type");
  must(await db().rpc("copy_template", { p_from: need(f, "copy_from", "A type to copy from"), p_to: id }));
  revalidatePath(`/registration-types/${id}`);
}

// ---------- registering customers ----------
export type RegisterRow = { customer_id: string; account_ref?: string; active_from?: string };
export type RegisterResult = { created: { registration_id: string; customer_id: string; name: string }[]; skipped: { customer_id: string; name?: string; why: string }[]; tasks: number };

export async function registerCustomers(typeId: string, rows: RegisterRow[]): Promise<RegisterResult> {
  if (!rows.length) throw new Error("Pick at least one customer");
  const res = must(await db().rpc("register_customers", { p_type: typeId, p_rows: rows })) as unknown as RegisterResult;
  revalidatePath(`/registration-types/${typeId}`);
  revalidatePath("/customers", "layout");
  return res;
}

export async function endRegistration(f: FormData) {
  must(await db().rpc("end_registration", { p_registration: need(f, "registration_id", "The registration"), p_last_day: need(f, "last_day", "A last day") }));
  revalidatePath("/customers", "layout");
  revalidatePath("/registration-types", "layout");
}
