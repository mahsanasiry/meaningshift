import { describe, expect, it } from "vitest";
import { alignMentions } from "@/features/detection/pairing";

type Item = { span: { start: number; end: number }; key: string; group?: string };

const item = (start: number, key: string, group = "g"): Item => ({
  span: { start, end: start + 1 },
  key,
  group,
});

const options = {
  equivalent: (a: Item, b: Item) => a.key === b.key,
  groupOf: (value: Item) => value.group ?? "",
};

describe("alignMentions", () => {
  it("reports nothing when both sides agree", () => {
    const result = alignMentions(
      [item(0, "x"), item(5, "y")],
      [item(1, "y"), item(2, "x")],
      options,
    );
    expect(result.unmatched).toEqual([]);
    expect(result.matched).toHaveLength(2);
  });

  it("pairs unmatched mentions of the same group as a change", () => {
    const { unmatched } = alignMentions([item(0, "40")], [item(0, "45")], options);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0]?.a?.key).toBe("40");
    expect(unmatched[0]?.b?.key).toBe("45");
  });

  it("does not pair mentions of different groups", () => {
    const { unmatched } = alignMentions(
      [item(0, "40", "percent")],
      [item(0, "3", "plain")],
      options,
    );
    expect(unmatched).toHaveLength(2);
    expect(unmatched.map((pair) => [pair.a === null, pair.b === null])).toEqual([
      [false, true],
      [true, false],
    ]);
  });

  it("reports leftovers as present on one side only", () => {
    const { unmatched } = alignMentions([item(0, "x"), item(3, "y")], [item(0, "x")], options);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0]?.b).toBeNull();
    expect(unmatched[0]?.a?.key).toBe("y");
  });

  it("uses each mention at most once", () => {
    const { matched, unmatched } = alignMentions(
      [item(0, "x"), item(2, "x")],
      [item(1, "x")],
      options,
    );
    expect(matched).toHaveLength(1);
    expect(unmatched).toHaveLength(1);
  });

  it("orders differences by where they start", () => {
    const { unmatched } = alignMentions([item(9, "late")], [item(2, "early")], options);
    expect(unmatched).toHaveLength(1);
    const { unmatched: spread } = alignMentions(
      [item(9, "a1", "one"), item(1, "a2", "two")],
      [],
      options,
    );
    expect(spread.map((pair) => pair.a?.key)).toEqual(["a2", "a1"]);
  });
});
