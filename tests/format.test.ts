import { describe, expect, it } from "vitest";
import { count, day, daysFrom, money, month } from "@/lib/format";

describe("formatting", () => {
  it("formats calendar dates without shifting the day for time zones", () => {
    const y = new Date().getFullYear();
    expect(day(`${y}-11-01`)).toBe("1 Nov");
    expect(day("2020-01-31")).toBe("31 Jan 2020");
    expect(day("2020-01-31T23:30:00+00:00")).toBe("31 Jan 2020");
    expect(day(null)).toBe("");
  });

  it("formats months, money and counts", () => {
    expect(month("2026-12-01")).toBe("Dec 2026");
    expect(money(1234.5)).toBe("1,234.50");
    expect(money(null)).toBe("");
    expect(count(1, "return")).toBe("1 return");
    expect(count(1200, "return")).toBe("1,200 returns");
  });

  it("counts days from the run's as-of date", () => {
    expect(daysFrom("2026-11-19", "2026-11-05")).toBe(14);
    expect(daysFrom("2026-11-01", "2026-11-05")).toBe(-4);
    expect(daysFrom(null, "2026-11-05")).toBeNull();
  });
});
