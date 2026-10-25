import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { parseUnitProfile, unitTitle, venueShort } from "@/lib/unitProfile";
import { crestAlt, eventPromo, nameNumber, nameOr, shortNameOr, siteOriginOr, titleOr } from "@/lib/unitText";
import { eventQrTarget } from "@/lib/eventDuplicate";
import { DEPLOYMENT_ORIGIN, PRODUCTION_HOSTS } from "@/lib/deployment";
import { accountsFileName, deadlineReminderTitle, lodgeNameOr, lodgeShortName } from "../../supabase/functions/_shared/lodgeSettingsResolve";
import { EVENTS_FROM_ADDRESS } from "../../supabase/functions/_shared/emailDomains";

const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

// Synthetic copy of today's Unit Setup values (as returned by get_public_unit_profile).
const W = parseUnitProfile({
  lodge_name: "Weybridge Lodge", lodge_number: "6787", province_name: "Province of Surrey",
  site_url: "https://weybridgelodge.org.uk", venue_name: "Guildford Masonic Centre",
  venue_lines: ["Guildford Masonic Centre, Weybourne House,", "Hitherbury Close,", "Guildford, Surrey GU2 4DR"],
  instagram_url: "https://www.instagram.com/weybridgelodge",
});
const BLANK = parseUnitProfile(null);

describe("Job BQ: today's wording is unchanged for the host lodge", () => {
  it("portal and booking lines", () => {
    expect(`The private area for brethren of ${titleOr(W)}.`).toBe("The private area for brethren of Weybridge Lodge No. 6787.");
    expect(nameNumber(W)).toBe("Weybridge Lodge 6787");
    expect(crestAlt(W)).toBe("Weybridge Lodge crest");
    expect(`Approved members of ${nameOr(W, "your lodge")}.`).toBe("Approved members of Weybridge Lodge.");
    expect(`${nameOr(W)} widow`).toBe("Weybridge Lodge widow");
    expect(`Ref: ${shortNameOr(W)} visit`).toBe("Ref: Weybridge visit");
    expect(eventPromo(W)).toBe("Weybridge Lodge is a friendly Masonic Lodge in Surrey.");
    expect(`Your event booking with ${titleOr(W, "the lodge")}.`).toBe("Your event booking with Weybridge Lodge No. 6787.");
    expect(["Dining & Bookings", [unitTitle(W), W.venueName].join(" — ")].join(" | ")).toBe("Dining & Bookings | Weybridge Lodge No. 6787 — Guildford Masonic Centre");
    expect(`Our upcoming meetings at the ${venueShort(W)}`).toBe("Our upcoming meetings at the Guildford Masonic Centre, GU2 4DR");
    expect(siteOriginOr(W)).toBe("https://weybridgelodge.org.uk");
    expect(eventQrTarget({ slug: "christmas-party-2026" }, siteOriginOr(W))).toBe("https://weybridgelodge.org.uk/events/christmas-party-2026");
  });
  it("edge-function wording", () => {
    expect(deadlineReminderTitle("Weybridge Lodge")).toBe("Booking Deadline For Weybridge Meeting Approaching");
    expect(accountsFileName("Weybridge Lodge", 2025)).toBe("Weybridge-Lodge-Accounts-FY2025-26.pdf");
    expect(`${lodgeNameOr("Weybridge Lodge")} annual subscription 2026/2027`).toBe("Weybridge Lodge annual subscription 2026/2027");
    expect(EVENTS_FROM_ADDRESS).toBe("notify@events.weybridgelodge.org.uk");
  });
  it("deployment addresses are unchanged (sign-in redirect, noindex protection, native app)", () => {
    expect(DEPLOYMENT_ORIGIN).toBe("https://weybridgelodge.org.uk");
    expect([...PRODUCTION_HOSTS]).toEqual(["weybridgelodge.org.uk", "www.weybridgelodge.org.uk"]);
  });
  it("blank Unit Setup gives neutral wording, never a host value", () => {
    const out = [titleOr(BLANK), nameNumber(BLANK), crestAlt(BLANK), nameOr(BLANK), shortNameOr(BLANK), eventPromo(BLANK),
      deadlineReminderTitle(""), accountsFileName("", 2025), lodgeShortName(null)].join(" | ");
    expect(out).not.toMatch(/Weybridge|6787/);
    expect(deadlineReminderTitle("")).toBe("Booking Deadline For Your Lodge Meeting Approaching");
    expect(eventPromo(BLANK)).toBe("Your Lodge is a friendly Masonic Lodge.");
  });
});

// Files converted in Job BQ must not reintroduce typed host-lodge values.
// Marketing pages (Index, History, News, Officers, FAQ, JoinUs…), SEO.tsx, JoinCTA.tsx,
// testimonials.ts, posts.ts and App.tsx redirects are unit-owned content and are not listed.
// Deployment-level addresses live only in src/lib/deployment.ts and _shared/emailDomains.ts.
const GUARDED = [
  "supabase/functions/dues-create-checkout/index.ts",
  "supabase/functions/dues-apply-price-change/index.ts",
  "supabase/functions/accounts-link/index.ts",
  "supabase/functions/send-summons-to-visitors/index.ts",
  "supabase/functions/send-event-invite/index.ts",
  "supabase/functions/meeting-deadline-reminder/index.ts",
  "supabase/functions/_shared/stripe-events.ts",
  "supabase/functions/_shared/transactional-email-templates/_brand.ts",
  "supabase/functions/_shared/transactional-email-templates/newsletter-welcome.tsx",
  "supabase/functions/_shared/transactional-email-templates/newsletter-confirm.tsx",
  "src/lib/eventDuplicate.ts",
  "src/lib/assetUrl.ts",
  "src/lib/summonsPdf.tsx",
  "src/lib/officersProgression.ts",
  "src/components/SocialShare.tsx",
  "src/components/NoindexGuard.tsx",
  "src/components/members/MembersLayout.tsx",
  "src/components/members/almoner/WidowsPanel.tsx",
  "src/components/members/treasurer/NewMemberFeesTab.tsx",
  "src/components/bookings/SaveTheDate.tsx",
  "src/pages/members/Dashboard.tsx",
  "src/pages/members/Login.tsx",
  "src/pages/members/Directory.tsx",
  "src/pages/members/working-groups/Socials.tsx",
  "src/pages/members/working-groups/Index.tsx",
  "src/pages/members/working-groups/Visits.tsx",
  "src/pages/members/admin/MeetingDiary.tsx",
  "src/pages/Bookings.tsx",
  "src/pages/PublicEventBalance.tsx",
  "src/pages/PublicEventConfirmation.tsx",
];
// Asset file names (weybridge-logo-*.png) are out of scope, so import paths are stripped first.
const strip = (s: string) => s.replace(/@\/assets\/weybridge-[\w.-]+/g, "");
describe("Job BQ literal guard", () => {
  for (const f of GUARDED) it(f, () => {
    expect(strip(read(f))).not.toMatch(/weybridgelodge|Weybridge|\b6787\b|bright-lodge-spark|lovable\.app\/__l5e|GU2 4DR|Guildford Masonic/);
  });
  it("PublicEvent.tsx: only the out-of-scope lodge_label enum remains", () => {
    const left = read("src/pages/PublicEvent.tsx").match(/Weybridge[^"]*/g) ?? [];
    expect(left.every((m) => m === "Weybridge")).toBe(true);
    expect(read("src/pages/PublicEvent.tsx")).not.toMatch(/Weybridge Lodge|\b6787\b/);
  });
});
