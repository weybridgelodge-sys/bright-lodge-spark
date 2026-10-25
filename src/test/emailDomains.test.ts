import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { EMAIL_DOMAINS } from "../../supabase/functions/_shared/emailDomains";
import { siteUrlFor, NEUTRAL_SAMPLE_URL } from "../../supabase/functions/_shared/authEmailBrand";

const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

describe("deployment email domains (Job BB)", () => {
  it("keep today's verified values", () => {
    expect(EMAIL_DOMAINS).toEqual({ senderDomain: "notify.email.weybridgelodge.org.uk", rootDomain: "email.weybridgelodge.org.uk", fromDomain: "email.weybridgelodge.org.uk" });
  });
  it("sign-in links use Unit Setup site_url, else the given fallback", () => {
    expect(siteUrlFor({ siteUrl: "https://lodge.example/" }, "https://f.example")).toBe("https://lodge.example");
    expect(siteUrlFor({ siteUrl: "" }, NEUTRAL_SAMPLE_URL)).toBe("https://example.com");
    expect(siteUrlFor(null, "https://f.example")).toBe("https://f.example");
    expect(siteUrlFor({ siteUrl: "http://insecure.example" }, "https://f.example")).toBe("https://f.example");
  });
});

// Guard: files converted in Job BB hold no typed host-lodge domain, name, number, province or app URL.
const CONVERTED = [
  "supabase/functions/auth-email-hook/index.ts",
  "supabase/functions/_shared/authEmailBrand.ts",
  "src/lib/summons.ts",
  // summonsPdf.tsx: cover-image path converted; its inner-page GDPR sentence still names the lodge (out of scope, reported).
  "src/lib/summonsCoverImages.ts",
  "src/pages/members/SummonsBuilder.tsx",
  // Job BD. send-email.ts not yet listed: SITE_NAME literal held pending a decision (space in "No.6787").
  "supabase/functions/broadcast-newsletter/index.ts",
];
describe("Job BB literal guard", () => {
  for (const f of CONVERTED) it(f, () => {
    const src = read(f);
    expect(src).not.toMatch(/weybridgelodge|Weybridge Lodge|\b6787\b|lovable\.app|"Surrey"|Province of Surrey/i);
  });
});
