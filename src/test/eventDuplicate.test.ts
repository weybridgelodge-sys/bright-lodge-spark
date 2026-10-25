import { describe, it, expect } from "vitest";
import jsQR from "jsqr";
import { buildDuplicatePayload, uniqueSlug, bumpYear, eventQrTarget, addOneYear } from "@/lib/eventDuplicate";
import { renderQrPixels, hslTokenToRgb } from "@/lib/eventQr";

const xmas = {
  id: "x", name: "Christmas Party 2026", public_title: "Joint Christmas Party 2026", slug: "christmas-party-2026",
  event_date: "2026-12-19", booking_deadline: "2026-12-01T00:00:00Z", is_public: true, archived_at: null,
  adult_price_pence: 3500, child_price_pence: 1500, start_time: "17:00", end_time: "00:00", reference_prefix: "XMAS26",
  stripe_balance: 999, status: "open", short_link: "https://bit.ly/old",
};

describe("duplicate event", () => {
  it("creates an unpublished, unarchived draft with no deadline", () => {
    const p = buildDuplicatePayload(xmas, []);
    expect(p.is_public).toBe(false);
    expect(p.archived_at).toBeNull();
    expect(p.booking_deadline).toBeNull();
    expect(p.status).toBe("planning");
    expect(p).not.toHaveProperty("id");
    expect(p).not.toHaveProperty("stripe_balance");
  });
  it("moves date +1 year and bumps years", () => {
    const p = buildDuplicatePayload(xmas, []);
    expect(p.event_date).toBe("2027-12-19");
    expect(p.public_title).toBe("Joint Christmas Party 2027");
    expect(p.slug).toBe("christmas-party-2027");
    expect(p.reference_prefix).toBe("XMAS27");
    expect(p.adult_price_pence).toBe(3500);
  });
  it("never collides with an existing slug", () => {
    expect(buildDuplicatePayload(xmas, ["christmas-party-2027"]).slug).toBe("christmas-party-2027-2");
    expect(uniqueSlug("a", ["a", "a-2"])).toBe("a-3");
  });
  it("appends (copy) when no year", () => expect(bumpYear("Summer BBQ").changed).toBe(false));
  it("handles 29 Feb", () => expect(addOneYear("2028-02-29")).toBe("2029-02-28"));
});

describe("event QR", () => {
  it("uses short link when set, else canonical URL", () => {
    expect(eventQrTarget({ slug: "a", short_link: "https://bit.ly/x" }, "https://lodge.example")).toBe("https://bit.ly/x");
    expect(eventQrTarget({ slug: "a", short_link: "" }, "https://lodge.example/")).toBe("https://lodge.example/events/a");
  });
  const colours = { navy: hslTokenToRgb("220 45% 10%"), gold: hslTokenToRgb("42 55% 55%"), white: [255, 255, 255] as [number, number, number] };
  for (const style of ["navy-on-white", "white-on-navy"] as const) {
    const url = "https://weybridgelodge.org.uk/events/christmas-party-2026";
    it(`${style} decodes back to the URL`, () => {
      const { data, size } = renderQrPixels(url, style, colours, 400);
      const res = jsQR(data, size, size, { inversionAttempts: "attemptBoth" });
      expect(res?.data).toBe(url);
    });
    it(`${style} PNG keeps a gold border outside a clean quiet zone`, () => {
      const { data, size } = renderQrPixels(url, style, colours, 400);
      const px = (x: number, y: number) => {
        const i = (y * size + x) * 4;
        return [data[i], data[i + 1], data[i + 2]] as [number, number, number];
      };
      const isGold = (x: number, y: number) => px(x, y).every((v, k) => v === colours.gold[k]);
      for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) expect(isGold(x, y)).toBe(true);
      const mid = Math.floor(size / 2);
      let edge = -1;
      for (let x = 0; x < size; x++) if (!isGold(x, mid)) { edge = x; break; }
      expect(edge).toBeGreaterThan(0);
      const bg = style === "navy-on-white" ? colours.white : colours.navy;
      expect(px(edge, mid)).toEqual(bg);
      expect(px(edge * 2, mid)).toEqual(bg);
    });
  }
});
