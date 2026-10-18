import { describe, it, expect } from "vitest";
import { thisYearTotal } from "@/components/charity/OurCharitiesLiveFeed";

describe("Our Charities this-year figure", () => {
  it("hides (null) when metrics failed and no breakdown — never £0", () => expect(thisYearTotal(null, [])).toBeNull());
  it("shows a genuine zero from a successful metrics response", () => expect(thisYearTotal(0, [])).toBe(0));
  it("uses breakdown sum when metrics failed but breakdown succeeded", () => expect(thisYearTotal(null, [{ year_total: 120 }, { year_total: 30 }])).toBe(150));
});
