import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { provinceReturnEmail } from "../../supabase/functions/_shared/provinceReturnEmail";
import { pickReturnCc } from "../../supabase/functions/_shared/returnFilingRules";

const v = { name: "Province of Example", provincial_return_email: " PGS@Example.org ", installation_return_email: "office@example.org" };
const read = (p: string) => readFileSync(p, "utf8");

describe("province return destination (Unit Setup > Province)", () => {
  it("reads each return's own address", () => {
    expect(provinceReturnEmail(v, "provincial")).toBe("pgs@example.org");
    expect(provinceReturnEmail(v, "installation")).toBe("office@example.org");
  });
  it("missing or invalid key fails safe to empty (no fallback)", () => {
    expect(provinceReturnEmail({ name: "x" }, "provincial")).toBe("");
    expect(provinceReturnEmail(null, "installation")).toBe("");
    expect(provinceReturnEmail({ provincial_return_email: "nope" }, "provincial")).toBe("");
  });
  it("every reader uses the new source, never the retired module_settings keys", () => {
    for (const p of ["supabase/functions/submit-provincial-return/index.ts", "supabase/functions/submit-installation-return/index.ts",
      "src/pages/members/admin/ProvincialReturn.tsx", "src/pages/members/admin/InstallationReturn.tsx", "src/lib/installationReturn.ts"]) {
      const s = read(p);
      expect(s, p).not.toMatch(/(provincial|installation)_return_province_email/);
    }
    for (const p of ["supabase/functions/submit-provincial-return/index.ts", "supabase/functions/submit-installation-return/index.ts"]) {
      const s = read(p);
      expect(s, p).toContain("loadProvinceReturnEmail(admin, user.id");
      expect(s, p).toMatch(/if \(!configured\) return json\(\{ error: "[^"]*Nothing was sent\." \}, 400\)/);
    }
  });
  it("confirmation still shows the destination before sending", () => {
    expect(read("src/pages/members/admin/ProvincialReturn.tsx")).toContain("<strong>To:</strong> <EmailText email={pgsEmail} />");
    expect(read("src/pages/members/admin/InstallationReturn.tsx")).toContain("<strong>To:</strong> <EmailText email={provinceEmail} />");
  });
  it("To is never also a Cc", () => {
    const r = pickReturnCc("pgs@example.org", [{ office: "secretary", memberId: "a", roleEmail: "PGS@example.org", memberEmail: null }, { office: "worshipful_master", memberId: "b", roleEmail: null, memberEmail: "wm@example.org" }]);
    expect(r.cc).toEqual(["wm@example.org"]);
  });
});
