import { it } from "vitest";
import { resolveLodgeSettings, returnFileName } from "../../supabase/functions/_shared/lodgeSettingsResolve";
it("live", async () => {
  // Read the seeded rows via the service-free path: values printed by the migration seed (read with read_query separately).
  const us = JSON.parse(process.env.US_JSON!);
  const s = resolveLodgeSettings(null, us);
  console.log("FILES", returnFileName(s.provincialReturnFile, 2026, "pdf"), returnFileName(s.provincialReturnFile, 2026, "docx"), returnFileName(s.installationReturnFile, 2026, "pdf"), "|CAL", s.calendarName, "|NEWS", s.newsletterMasthead, "·", s.newsletterFooterNote, "|PROV", s.provinceName);
});
