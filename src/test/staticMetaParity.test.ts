import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { staticRoutes } from "../../vite-plugin-static-meta";

/**
 * The prerendered head (vite-plugin-static-meta.ts) must match the <SEO>
 * props in each page component, which are the source of truth.
 */
const PAGE_FOR_ROUTE: Record<string, string> = {
  "": "Index",
  "news/three-masonic-degrees-explained": "news/ThreeMasonicDegrees",
  "what-is-freemasonry": "WhatIsFreemasonry",
  "freemasonry-and-charity": "FreemasonryCharity",
  "our-charities": "OurCharities",
  "join-us": "JoinUs",
  "freemason-initiation-night": "FirstVisit",
  "your-journey": "YourJourney",
  "lodge-traditions": "LodgeTraditions",
  "data-protection": "DataProtection",
  "accessibility-statement": "AccessibilityStatement",
  "lodge-profile": "LodgeProfile",
  history: "History",
  heritage: "HeritageArchive",
  "worshipful-masters": "WorshipfulMasters",
  officers: "Officers",
  faq: "FAQ",
  contact: "Contact",
  "video-hub": "VideoHub",
  "masonic-links": "MasonicLinks",
  bookings: "Bookings",
  "officers-jewels": "OfficersJewels",
  events: "Events",
  "ladies-festival": "LadiesFestival",
  "ladies-night": "LadiesFestival",
  quiz: "Quiz",
  "south-surrey-freemasons": "SouthSurreyFreemasons",
  "thames-challenge": "ThamesChallengePage",
};

const read = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, "../pages", `${name}.tsx`), "utf8");

/** Resolve a JSX prop value: "literal", {CONST}, or {`template`}. */
function seoProp(src: string, prop: "title" | "description"): string {
  const seo = src.slice(src.indexOf("<SEO"));
  const m = seo.match(new RegExp(`\\b${prop}=(?:"([^"]*)"|\\{\\s*([A-Z_]+)\\s*\\}|\\{\`([^\`]*)\`\\})`));
  if (!m) throw new Error(`no ${prop} prop on <SEO>`);
  if (m[1] !== undefined) return m[1];
  if (m[3] !== undefined)
    // Bookings: dining label defaults to "Festive Board"
    return m[3].replace("${diningLabel.toLowerCase()}", "festive board");
  const c = src.match(new RegExp(`const ${m[2]}\\s*=\\s*"([^"]*)"`));
  if (!c) throw new Error(`const ${m[2]} not found`);
  return c[1];
}

describe("static meta parity with page <SEO> props", () => {
  for (const r of staticRoutes) {
    if (r.route === "news" || r.route.startsWith("news/category/")) continue;
    it(`/${r.route}`, () => {
      const page = PAGE_FOR_ROUTE[r.route];
      expect(page, `no page mapped for ${r.route}`).toBeTruthy();
      const src = read(page);
      expect(r.title).toBe(seoProp(src, "title"));
      expect(r.description).toBe(seoProp(src, "description"));
    });
  }

  it("news routes match News.tsx", () => {
    const src = read("News");
    for (const r of staticRoutes.filter((x) => x.route === "news" || x.route.startsWith("news/category/"))) {
      if (r.route === "news") {
        expect(src).toContain(`: "${r.description}"`);
      } else {
        const key = r.route.split("/").pop();
        if (!key) throw new Error(`missing category for ${r.route}`);
        const m = src.match(new RegExp(`"?${key}"?:\\s*"([^"]*)"`));
        expect(m?.[1]).toBe(r.description);
      }
    }
  });
});
