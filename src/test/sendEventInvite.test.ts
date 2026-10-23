import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { formatEventEmailHtml } from "@/lib/sendEventInvite";

const base = { heading: "Visit", intro: "Brethren,", fields: [{ label: "When", value: "Tue" }] };
const ID = { crestUrl: "https://cdn.example.test/c.png", lodgeName: "Example Lodge", lodgeNumber: "1234", provinceName: "Province of Testshire" };

describe("event invite email brand", () => {
  it("uses the Unit Setup crest and lodge identity in header and footer", () => {
    const html = formatEventEmailHtml({ ...base, identity: ID });
    expect(html).toContain('src="https://cdn.example.test/c.png"');
    expect(html).toContain("Example Lodge");
    expect(html).toContain("No. 1234 — Province of Testshire");
    expect(html).toContain("S&F, Example Lodge No. 1234");
  });
  it("blank crest: no image, header text kept", () => {
    const html = formatEventEmailHtml({ ...base, identity: { ...ID, crestUrl: "" } });
    expect(html).not.toContain("<img");
    expect(html).toContain("Example Lodge");
  });
  it("no identity: no crest, no lodge text, plain sign-off", () => {
    const html = formatEventEmailHtml(base);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/Weybridge|6787|Surrey/);
    expect(html).toContain(">S&F</p>");
  });
  it("caller's footer wording is kept", () => {
    expect(formatEventEmailHtml({ ...base, identity: ID, footer: "S&F, Example Lodge Social Committee" })).toContain("S&F, Example Lodge Social Committee");
  });
});
