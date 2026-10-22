import { describe, it, expect } from "vitest";
import { decodeSize, sniffImageType, readFileOnce, SIG_MSG_UNREADABLE } from "@/lib/signatureImage";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
describe("signature upload helpers", () => {
  it("downscales a 4000x3000 photo to 1600 longest side", () => expect(decodeSize(4000, 3000)).toEqual({ w: 1600, h: 1200 }));
  it("never enlarges a small image", () => expect(decodeSize(250, 95)).toEqual({ w: 250, h: 95 }));
  it("sniffs JPEG and PNG from bytes", () => {
    expect(sniffImageType(jpeg)).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
  it("reads a file once into a typed in-memory copy, even with an empty type", async () => {
    const r = await readFileOnce(new Blob([jpeg]));
    expect(r.ok && r.blob.type).toBe("image/jpeg");
  });
  it("reports an unreadable file as 'choose again'", async () => {
    const bad = { size: 10, arrayBuffer: () => Promise.reject(new DOMException("NotReadableError")) } as unknown as Blob;
    expect(await readFileOnce(bad)).toEqual({ ok: false, error: SIG_MSG_UNREADABLE });
  });
  it("rejects a non-image file", async () => {
    const r = await readFileOnce(new Blob([new Uint8Array([1, 2, 3, 4])]));
    expect(r.ok).toBe(false);
  });
});
