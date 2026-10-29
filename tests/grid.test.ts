import { describe, expect, it } from "vitest";
import { GRIDS, checkScope, filterTree, order, quote, searchTree } from "@/lib/grid";

const tasks = GRIDS.tasks;

describe("grid filters to PostgREST", () => {
  it("quotes values so commas and brackets stay data", () => {
    expect(quote('Acme, Inc (US) "x"')).toBe('"Acme, Inc (US) \\"x\\""');
  });

  it("turns text filters into case-insensitive matches", () => {
    expect(filterTree(tasks, { title: { filterType: "text", type: "contains", filter: "review" } })).toBe('title.ilike."*review*"');
    expect(filterTree(tasks, { due_flag: { filterType: "text", type: "equals", filter: "Overdue" } })).toBe('due_flag.ilike."Overdue"');
    expect(filterTree(tasks, { owner_name: { filterType: "text", type: "blank" } })).toBe('or(owner_name.is.null,owner_name.eq."")');
  });

  it("joins several columns with and, and keeps a column's own and/or", () => {
    const tree = filterTree(tasks, {
      title: { filterType: "text", operator: "OR", conditions: [
        { filterType: "text", type: "startsWith", filter: "Sync" }, { filterType: "text", type: "contains", filter: "review" }] },
      due_date: { filterType: "date", type: "inRange", dateFrom: "2026-11-01 00:00:00", dateTo: "2026-11-07 00:00:00" },
    });
    expect(tree).toBe('and(or(title.ilike."Sync*",title.ilike."*review*"),and(due_date.gte."2026-11-01",due_date.lte."2026-11-07"))');
  });

  it("handles numbers and refuses junk", () => {
    expect(filterTree(GRIDS.returns, { stage_n: { filterType: "number", type: "greaterThanOrEqual", filter: 6 } })).toBe("stage_n.gte.6");
    expect(() => filterTree(GRIDS.returns, { stage_n: { filterType: "number", type: "equals", filter: "six" } })).toThrow();
    expect(() => filterTree(tasks, { password: { filterType: "text", type: "contains", filter: "x" } })).toThrow(/Unknown column/);
  });

  it("returns nothing when nothing is filtered or searched", () => {
    expect(filterTree(tasks, {})).toBeNull();
    expect(searchTree(tasks, "  ")).toBeNull();
    expect(searchTree(tasks, "tx")).toBe('or(title.ilike."*tx*",parent_title.ilike."*tx*",owner_name.ilike."*tx*",notes.ilike."*tx*")');
  });

  it("sorts by the user's choice, then the default order as a tie-break", () => {
    expect(order(tasks, [{ colId: "owner_name", sort: "desc" }])).toEqual([
      { field: "owner_name", asc: false }, { field: "due_date", asc: true }, { field: "task_id", asc: true }]);
    expect(order(tasks, [{ colId: "nope", sort: "asc" }])).toEqual(tasks.sort);
  });

  it("only lets a page scope by known columns", () => {
    expect(() => checkScope(tasks, [{ field: "secret", op: "eq", value: 1 }])).toThrow();
    expect(checkScope(tasks, [{ field: "run_id", op: "eq", value: "RUN-2026-11" }])).toHaveLength(1);
  });
});
