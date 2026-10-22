// Search-engine copy is pre-rendered and must stay typed (index.html, static meta, SEO.tsx).
// This check fails when that typed copy drifts from the unit record in Unit Setup.
// Runs against the live public lookup when the backend address is configured; skipped offline.
import { describe, it, expect } from "vitest";
import fs from "fs";
import { parseUnitProfile, unitTitle } from "@/lib/unitProfile";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const run = url && key ? describe : describe.skip;

run("static SEO copy matches the unit record", () => {
  it("lodge title, venue and postcode in pre-rendered files", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/get_public_unit_profile`, { method: "POST", headers: { apikey: key!, "Content-Type": "application/json" }, body: "{}" });
    expect(r.ok).toBe(true);
    const p = parseUnitProfile(await r.json());
    const title = unitTitle(p);
    expect(title).not.toBe("");
    const postcode = p.venueLines.join(" ").match(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}/)?.[0] ?? "";
    for (const f of ["index.html", "vite-plugin-static-meta.ts", "src/components/SEO.tsx"]) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, `${f} lodge title`).toContain(title);
      if (p.venueName) expect(src, `${f} venue`).toContain(p.venueName);
      if (postcode && f !== "src/components/SEO.tsx") expect(src, `${f} postcode`).toContain(postcode);
    }
    const seo = fs.readFileSync("src/components/SEO.tsx", "utf8");
    expect(seo).toContain(`const SITE_NAME = "${title}"`);
  });
});
