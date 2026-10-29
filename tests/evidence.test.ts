import { describe, expect, it } from "vitest";
import { describe as words, parseEvidence, tunable } from "@/lib/evidence";

// The shape evaluate_return() writes for an effect rule whose condition is "any of" two others
const evidence = [{
  condition: "RUL-009", name: "Gap needs explaining", result: "can't tell", evidence: [
    { condition: "RUL-001", name: "Large gap", result: "can't tell", evidence: [
      { measure: "gap_abs", op: ">", value: 1000, actual: null, result: "can't tell", why: "gap_abs is not known yet" }] },
    { condition: "RUL-002", name: "Gap over 5%", result: "not met", evidence: [
      { measure: "gap_pct", op: ">", value: 0.05, actual: 0.01, result: "not met" }] },
  ],
}];

describe("rule evidence", () => {
  it("parses the evaluator's evidence into a tree", () => {
    const [root] = parseEvidence(evidence);
    expect(root.type).toBe("condition");
    if (root.type !== "condition") return;
    expect(root.children).toHaveLength(2);
    const [large] = root.children;
    expect(large.type === "condition" && large.children[0]).toMatchObject({ type: "fact", measure: "gap_abs", why: "gap_abs is not known yet" });
  });

  it("ignores anything that isn't evidence", () => {
    expect(parseEvidence(null)).toEqual([]);
    expect(parseEvidence([1, "x", { other: true }])).toEqual([]);
  });

  it("describes a condition in words", () => {
    const names = new Map([["RUL-001", "Large gap"], ["RUL-002", "Gap over 5%"]]);
    expect(words({ any: [{ condition: "RUL-001" }, { condition: "RUL-002" }] }, names)).toBe("any of: Large gap, Gap over 5%");
    expect(words({ measure: "gap_pct", op: ">", value: 0.05 }, names)).toBe("Gap as a share of calculated over 5.0%");
    expect(words({ measure: "internal_review", op: "=", value: true }, names)).toBe("Customer needs internal review is yes");
  });

  it("only offers a threshold to change for a single numeric comparison", () => {
    expect(tunable({ measure: "gap_abs", op: ">", value: 1000 })).toEqual({ measure: "gap_abs", op: ">", value: 1000 });
    expect(tunable({ measure: "workflow", op: "=", value: "Prepayment" })).toBeNull();
    expect(tunable({ any: [] })).toBeNull();
  });
});
