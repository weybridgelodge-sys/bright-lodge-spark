import { describe, it, expect } from "vitest";
import { compareWelfareBoard, type WelfareRag } from "@/lib/welfareBoardSort";

const m = (id: string, first: string, last: string) => ({ id, first_name: first, last_name: last });
const order = (list: ReturnType<typeof m>[], badge: string[], rag: Record<string, WelfareRag>) =>
  [...list].sort((a, b) => compareWelfareBoard(a, b, (id) => badge.includes(id), (id) => rag[id] ?? "green")).map((x) => x.id);

describe("Welfare Board sort", () => {
  it("puts a green member with the badge above a red member without it", () => {
    expect(order([m("r", "A", "Adams"), m("g", "Z", "Young")], ["g"], { r: "red" })).toEqual(["g", "r"]);
  });
  it("orders Red, Amber, Green within the same badge group", () => {
    expect(order([m("g", "A", "A"), m("a", "B", "B"), m("r", "C", "C")], [], { a: "amber", r: "red" })).toEqual(["r", "a", "g"]);
  });
  it("sorts by surname before first name within the same colour", () => {
    expect(order([m("1", "Adam", "Smith"), m("2", "Zack", "Brown"), m("3", "Ben", "Smith")], [], {})).toEqual(["2", "1", "3"]);
  });
});
