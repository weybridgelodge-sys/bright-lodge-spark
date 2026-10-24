import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { normaliseTemplateAssets, NO_IMAGE_DEFAULTS } from "@/lib/summons";
import { coverImageError, imageDefaultsFrom } from "@/lib/summonsCoverImages";

// Rows captured before Job BB (today's stored template, outdated uploads, blanks) and the
// output the old typed defaults produced. With the seeded Unit Setup values the output must match.
const LEFT = "/__l5e/assets-v1/f22695d7-afc6-46a8-9daf-9564690178fc/TLC-Patron-Pin.jpg";
const RIGHT = "/__l5e/assets-v1/be3d0b35-5888-4ffa-b6b4-c7dfe04cc8f3/Festival_Gold_Award.png";
const OLD_LOGO = "/__l5e/assets-v1/045b91d4-9b41-490d-baa9-8486eca7cb05/weybridge-logo-no-bg.png";
const rows = [
  { logo_url: OLD_LOGO, cover_left_image_url: LEFT, cover_right_image_url: RIGHT },
  { logo_url: "/__l5e/assets-v1/57c18f79-500d-485c-bb45-3cef1b3bc800/weybridge-logo-navy.png", cover_left_image_url: "https://x.example/__l5e/assets-v1/3b24e36a-0ae2-48a6-beff-3f3a71f15e85/TLC-Patron-Pin.jpg", cover_right_image_url: "/__l5e/assets-v1/7435bffd-65eb-49e7-9086-2c349fdb427f/Festival_Gold_Award_no_background.png" },
  { logo_url: null, cover_left_image_url: null, cover_right_image_url: "" },
];
const seeded = imageDefaultsFrom([{ key: "summons_cover_images", value: { left_url: LEFT, right_url: RIGHT } }, { key: "crest_image", value: { url: "https://example.invalid/crest.png" } }]);

describe("summons cover images from Unit Setup", () => {
  it("award images resolve exactly as before for the seeded values", () => {
    const before = JSON.parse(readFileSync(`${process.cwd()}/src/test/__fixtures__/summonsCoverBefore.json`, "utf8"));
    const after = rows.map((r) => normaliseTemplateAssets(r as any, seeded));
    after.forEach((a, i) => {
      expect(a.cover_left_image_url).toBe(before[i].cover_left_image_url);
      expect(a.cover_right_image_url).toBe(before[i].cover_right_image_url);
    });
  });
  it("outdated uploads are rewritten to the Unit Setup images", () => {
    const a = normaliseTemplateAssets(rows[1] as any, seeded);
    expect([a.cover_left_image_url, a.cover_right_image_url, a.logo_url]).toEqual([LEFT, RIGHT, "https://example.invalid/crest.png"]);
  });
  it("blank Unit Setup = no image", () => {
    const a = normaliseTemplateAssets(rows[2] as any, NO_IMAGE_DEFAULTS);
    expect([a.cover_left_image_url, a.cover_right_image_url, a.logo_url]).toEqual(["", "", ""]);
  });
  it("only https or site paths are accepted", () => {
    expect(coverImageError("http://x/a.png")).toBe("Enter a public https:// image address.");
    expect(coverImageError("https://x/a.png")).toBeNull();
    expect(coverImageError("")).toBeNull();
    expect(imageDefaultsFrom([{ key: "summons_cover_images", value: { left_url: "javascript:x" } }]).left).toBe("");
  });
});
