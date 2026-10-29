import { describe, expect, it } from "vitest";
import { one, page, searchTerm, withParams } from "@/lib/params";

describe("URL filters", () => {
  it("reads the first value and treats blanks as missing", () => {
    expect(one({ a: ["x", "y"] }, "a")).toBe("x");
    expect(one({ a: "  " }, "a")).toBeUndefined();
  });

  it("pages in fifties and never below page 1", () => {
    expect(page({})).toEqual({ page: 1, from: 0, to: 49 });
    expect(page({ page: "3" })).toEqual({ page: 3, from: 100, to: 149 });
    expect(page({ page: "-2" }).page).toBe(1);
    expect(page({ page: "abc" }).page).toBe(1);
  });

  it("goes back to page 1 when a filter changes, keeps it when paging", () => {
    expect(withParams("/tasks", { run: "R", page: "4" }, { due: "Overdue" })).toBe("/tasks?run=R&due=Overdue");
    expect(withParams("/tasks", { run: "R" }, { page: 2 })).toBe("/tasks?run=R&page=2");
    expect(withParams("/tasks", { due: "Overdue" }, { due: undefined })).toBe("/tasks");
  });

  it("strips characters that are PostgREST syntax from a search", () => {
    expect(searchTerm("acme, inc (US)*")).toBe("acme  inc  US");
    expect(searchTerm(" , ")).toBeUndefined();
  });
});
