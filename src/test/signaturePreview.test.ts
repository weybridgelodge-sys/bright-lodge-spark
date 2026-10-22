import { describe, it, expect } from "vitest";
import { previewToPng, savedLine } from "@/lib/signaturePreview";

describe("signature preview response", () => {
  it("accepts octet-stream Blob bytes as a PNG", () => {
    const b = previewToPng(new Blob([new Uint8Array([0x89, 0x50])], { type: "application/octet-stream" }));
    expect(b?.type).toBe("image/png");
    expect(b?.size).toBe(2);
  });
  it("rejects text (what image/png used to arrive as)", () => expect(previewToPng("\u0089PNG...")).toBeNull());
  it("rejects empty bytes", () => expect(previewToPng(new Blob([]))).toBeNull());
  it("shows the saved date", () => expect(savedLine("2026-10-22T06:14:59Z")).toBe("Signature on file, saved 22 Oct 2026."));
  it("names the member", () => expect(savedLine(null, "R Smith")).toBe("Signature on file for R Smith."));
});
