import { describe, it, expect } from "vitest";
import { newsletterFooterHtml, newsletterHeaderHtml, type NewsletterBrand } from "../../supabase/functions/_shared/newsletterBrand";
import { newsletterDefaultSubject } from "@/lib/newsletterBrand";

const B: NewsletterBrand = {
  crestUrl: "https://cdn.example.test/c.png", lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire",
  masthead: "Example Chronicle", footerNote: "Example Hall, EX1 1AA", siteUrl: "https://example.org",
  facebookUrl: "https://fb.example/x", instagramUrl: "https://ig.example/x", twitterUrl: "",
};

describe("newsletter header/footer", () => {
  it("crest, lodge name, number/province, masthead title and strapline in order", () => {
    const h = newsletterHeaderHtml(B);
    const order = ['src="https://cdn.example.test/c.png"', ">Example Lodge<", "No. 1234 — Province of Testshire", ">Example Chronicle<", "Monthly Chronicle &amp; Labours"].map((t) => h.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(h).toContain("width=\"120\"");
  });
  it("blank crest: no image; blank masthead: no title line, rest kept", () => {
    const h = newsletterHeaderHtml({ ...B, crestUrl: "", masthead: "" });
    expect(h).not.toContain("<img");
    expect(h).not.toContain("Example Chronicle");
    expect(h).toContain("Example Lodge");
  });
  it("footer keeps masthead + note, preferences link and lodge footer; blank social links left out", () => {
    const f = newsletterFooterHtml(B, "https://x.test/u?token=a&b=1", 2026);
    expect(f).toContain("&copy; 2026 Example Chronicle &middot; Example Hall, EX1 1AA");
    expect(f).toContain("You're receiving this because Example Chronicle sends newsletters");
    expect(f).toContain('href="https://x.test/u?token=a&amp;b=1"');
    expect(f).toContain("change your newsletter preferences here");
    expect(f).toContain("Example Lodge No. 1234");
    expect(f).toContain(">IG<"); expect(f).not.toContain(">X<");
    expect(f).toContain("#6E4F0C");
  });
  it("blank masthead and note: copyright year only, sender falls back to lodge name", () => {
    const f = newsletterFooterHtml({ ...B, masthead: "", footerNote: "" }, "#", 2026);
    expect(f).toMatch(/&copy; 2026<br>/);
    expect(f).toContain("because Example Lodge sends");
  });
  it("no gold text on white and no host literals", () => {
    const all = newsletterHeaderHtml(B) + newsletterFooterHtml(B, "#");
    expect(all).not.toMatch(/(^|[;"])color:#C9A432/i);
    expect(all).not.toMatch(/Weybridge|6787|Surrey/);
  });
});

describe("newsletter default subject", () => {
  it("built from lodge identity; strapline only when unknown", () => {
    expect(newsletterDefaultSubject({ lodgeName: "Example Lodge", lodgeNumber: "1234" })).toBe("Example Lodge No. 1234 — Monthly Chronicle & Labours");
    expect(newsletterDefaultSubject(null)).toBe("Monthly Chronicle & Labours");
  });
});
