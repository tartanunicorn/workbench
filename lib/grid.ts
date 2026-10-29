// The grids page and filter in the database: AG Grid sends its filter and sort model, and this turns it into a
// PostgREST query on a whitelisted view. Only the rows on screen come back.

export type FieldType = "text" | "number" | "date" | "bool";

export type GridSpec = {
  view: "task_grid" | "return_grid" | "customer_grid" | "registration_type_grid" | "registration_grid";
  key: string;
  fields: Record<string, FieldType>;
  search: string[];                       // what the quick search box looks in
  sort: { field: string; asc: boolean }[]; // the default order, and the tie-break after any sort the user picks
};

export const GRIDS = {
  tasks: {
    view: "task_grid", key: "task_id",
    fields: {
      task_id: "text", title: "text", notes: "text", status: "text", due_date: "date", due_flag: "text", done_on: "date",
      kind: "text", kind_label: "text", parent_title: "text", owner_id: "text", owner_name: "text", owner_role: "text",
      blocked_by: "text", is_blocked: "bool", run_id: "text", return_id: "text", completes_stage: "number",
      category: "text", priority: "text", description: "text", raised_on: "date", raised_by: "text", waiting_on: "text",
      resolution: "text", source_ref: "text", customer_id: "text", customer_name: "text", affects: "text", returns_affected: "number",
      registration_id: "text",
    },
    search: ["title", "parent_title", "owner_name", "notes", "description", "customer_name", "category"],
    sort: [{ field: "due_date", asc: true }, { field: "task_id", asc: true }],
  },
  returns: {
    view: "return_grid", key: "return_id",
    fields: {
      return_id: "text", run_id: "text", customer_name: "text", type_name: "text", place_code: "text", tax_type: "text",
      frequency: "text", kind: "text", period_start: "date", period_end: "date", stage: "text", stage_n: "number", state: "text",
      tier: "text", tier_reasons: "text", rule_flags: "text", flag: "text", open_issues: "number", tasks_done: "number",
      tasks_total: "number", release_by: "date", submit_due: "date", calculated: "number", collected: "number", gap: "number",
      preparer_name: "text", reviewer_name: "text", preparer: "text", reviewer: "text",
    },
    search: ["customer_name", "type_name", "place_code", "return_id"],
    sort: [{ field: "submit_due", asc: true }, { field: "return_id", asc: true }],
  },
  customers: {
    view: "customer_grid", key: "customer_id",
    fields: {
      customer_id: "text", name: "text", org_id: "text", tier: "text", status: "text", internal_review: "bool",
      release_owner: "text", customer_approver: "text", registrations: "number", setup_open: "number", open_issues: "number", notes: "text",
    },
    search: ["name", "customer_id", "org_id"],
    sort: [{ field: "name", asc: true }, { field: "customer_id", asc: true }],
  },
  registrationTypes: {
    view: "registration_type_grid", key: "registration_type_id",
    fields: {
      registration_type_id: "text", name: "text", place_code: "text", country_code: "text", region_code: "text", tax_type: "text",
      frequency: "text", workflow: "text", active: "bool", due_rule: "text", due_value: "text", automation: "text",
      default_preparer: "text", default_reviewer: "text", customers: "number", template_tasks: "number",
    },
    search: ["name", "place_code", "registration_type_id"],
    sort: [{ field: "name", asc: true }, { field: "registration_type_id", asc: true }],
  },
  registrations: {
    view: "registration_grid", key: "registration_id",
    fields: {
      registration_id: "text", customer_id: "text", customer_name: "text", registration_type_id: "text", type_name: "text",
      place_code: "text", tax_type: "text", frequency: "text", account_source: "text", account_ref: "text",
      active_from: "date", active_to: "date", is_active: "bool", state: "text", verified_by: "text", last_portal_check: "date", setup_open: "number",
    },
    search: ["customer_name", "type_name", "account_ref", "registration_id"],
    sort: [{ field: "customer_name", asc: true }, { field: "type_name", asc: true }, { field: "registration_id", asc: true }],
  },
} satisfies Record<string, GridSpec>;

export type GridName = keyof typeof GRIDS;

// Filters a page fixes before the user adds their own (this run, open tasks only, one return's tasks)
export type Scope = { field: string; op: "eq" | "in" | "notIn"; value: string | number | boolean | string[] };

export type SimpleFilter = { filterType: string; type?: string; filter?: string | number | boolean | null; filterTo?: number | null; dateFrom?: string | null; dateTo?: string | null };
export type ColumnFilter = SimpleFilter | { filterType: string; operator: "AND" | "OR"; conditions: SimpleFilter[] };
export type FilterModel = Record<string, ColumnFilter>;
export type SortModel = { colId: string; sort: "asc" | "desc" }[];

export type GridRequest = {
  grid: GridName; startRow: number; endRow: number;
  sortModel?: SortModel; filterModel?: FilterModel; scope?: Scope[]; q?: string;
};

// A value inside a PostgREST logic tree, quoted so commas, dots and brackets in it are data, not syntax
export function quote(v: string | number): string {
  return `"${String(v).replace(/[\\"]/g, "\\$&")}"`;
}

function like(v: string, before: string, after: string): string {
  return quote(`${before}${v.replace(/[*%]/g, "")}${after}`);
}

function day(v: string | null | undefined): string {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) throw new Error(`Not a date: ${v}`);
  return v.slice(0, 10);
}

function simple(field: string, t: FieldType, f: SimpleFilter): string {
  const op = f.type ?? "equals";
  if (op === "blank") return t === "text" ? `or(${field}.is.null,${field}.eq."")` : `${field}.is.null`;
  if (op === "notBlank") return t === "text" ? `and(${field}.not.is.null,${field}.neq."")` : `${field}.not.is.null`;

  if (t === "text") {
    const v = String(f.filter ?? "");
    switch (op) {
      case "contains": return `${field}.ilike.${like(v, "*", "*")}`;
      case "notContains": return `${field}.not.ilike.${like(v, "*", "*")}`;
      case "equals": return `${field}.ilike.${like(v, "", "")}`;
      case "notEqual": return `${field}.not.ilike.${like(v, "", "")}`;
      case "startsWith": return `${field}.ilike.${like(v, "", "*")}`;
      case "endsWith": return `${field}.ilike.${like(v, "*", "")}`;
    }
  }
  if (t === "number" || t === "date") {
    const a = t === "number" ? Number(f.filter) : day(f.dateFrom);
    if (t === "number" && !Number.isFinite(a)) throw new Error(`Not a number: ${f.filter}`);
    const v = t === "number" ? String(a) : quote(a);
    switch (op) {
      case "equals": return `${field}.eq.${v}`;
      case "notEqual": return `${field}.neq.${v}`;
      case "lessThan": return `${field}.lt.${v}`;
      case "lessThanOrEqual": return `${field}.lte.${v}`;
      case "greaterThan": return `${field}.gt.${v}`;
      case "greaterThanOrEqual": return `${field}.gte.${v}`;
      case "inRange": {
        const b = t === "number" ? String(Number(f.filterTo)) : quote(day(f.dateTo));
        return `and(${field}.gte.${v},${field}.lte.${b})`;
      }
    }
  }
  if (t === "bool") return `${field}.is.${f.filter === true || f.filter === "true"}`;
  throw new Error(`Unsupported filter ${op} on ${field}`);
}

// The whole filter model as one PostgREST logic tree, or null when nothing is filtered
export function filterTree(spec: GridSpec, model: FilterModel | undefined): string | null {
  const parts: string[] = [];
  for (const [field, f] of Object.entries(model ?? {})) {
    const t = spec.fields[field];
    if (!t) throw new Error(`Unknown column ${field}`);
    if ("conditions" in f && Array.isArray(f.conditions)) {
      const inner = f.conditions.map((c) => simple(field, t, c));
      parts.push(`${f.operator === "OR" ? "or" : "and"}(${inner.join(",")})`);
    } else {
      parts.push(simple(field, t, f as SimpleFilter));
    }
  }
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : `and(${parts.join(",")})`;
}

export function searchTree(spec: GridSpec, q: string | undefined): string | null {
  const v = q?.trim();
  if (!v) return null;
  return `or(${spec.search.map((f) => `${f}.ilike.${like(v, "*", "*")}`).join(",")})`;
}

export function order(spec: GridSpec, sort: SortModel | undefined): { field: string; asc: boolean }[] {
  const chosen = (sort ?? []).filter((s) => spec.fields[s.colId]).map((s) => ({ field: s.colId, asc: s.sort === "asc" }));
  const rest = spec.sort.filter((d) => !chosen.some((c) => c.field === d.field));
  return [...chosen, ...rest];
}

export function checkScope(spec: GridSpec, scope: Scope[] | undefined): Scope[] {
  for (const s of scope ?? []) {
    if (!spec.fields[s.field]) throw new Error(`Unknown column ${s.field}`);
    if (!["eq", "in", "notIn"].includes(s.op)) throw new Error(`Unknown operator ${s.op}`);
  }
  return scope ?? [];
}
