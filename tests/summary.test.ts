import { describe, expect, it } from "vitest";
import { byFlag, byStage, total } from "@/lib/summary";

const rows = [
  { flag: "On track", tier: "B", stage_n: 4, stage: "4 In review", returns: 10 },
  { flag: "Late release", tier: "A", stage_n: 3, stage: "3 Generated", returns: 2 },
  { flag: "On track", tier: "A", stage_n: 4, stage: "4 In review", returns: 5 },
  { flag: "Done", tier: "B", stage_n: 8, stage: "8 Submitted", returns: 7 },
];

describe("run summary", () => {
  it("puts what is already wrong first", () => {
    expect(byFlag(rows)).toEqual([["Late release", 2], ["On track", 15], ["Done", 7]]);
  });

  it("adds up stages in order", () => {
    expect(byStage(rows).map((s) => [s.stage_n, s.returns])).toEqual([[3, 2], [4, 15], [8, 7]]);
  });

  it("totals with a filter", () => {
    expect(total(rows)).toBe(24);
    expect(total(rows, (r) => (r.stage_n ?? 0) >= 6)).toBe(7);
  });
});
