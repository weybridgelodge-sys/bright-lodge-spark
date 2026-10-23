import { describe, expect, it } from "vitest";
import { crestUrlError, crestUrlFrom, normaliseCrestUrl } from "@/lib/crestImage";

describe("crest image setting", () => {
  it("accepts https URLs containing 's' and 'assets'", () => {
    expect(crestUrlError("https://example.org/assets/crest.png")).toBeNull();
    expect(crestUrlError("https://example.org/__l5e/assets-v1/x/sample-crest-navy-transparent.png")).toBeNull();
  });
  it("rejects http, spaces and non-URLs", () => {
    for (const bad of ["http://example.org/c.png", "https://a b.png", "crest.png", "https://"]) expect(crestUrlError(bad)).not.toBeNull();
  });
  it("blank is allowed and means no crest", () => {
    expect(crestUrlError("  ")).toBeNull();
    expect(crestUrlFrom({ url: "" })).toBeNull();
    expect(crestUrlFrom(null)).toBeNull();
  });
  it("trims", () => {
    expect(normaliseCrestUrl("  https://example.org/c.png ")).toBe("https://example.org/c.png");
    expect(crestUrlFrom({ url: " https://example.org/c.png " })).toBe("https://example.org/c.png");
  });
});
