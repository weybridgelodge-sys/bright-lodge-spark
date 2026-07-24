import { supabase } from "@/integrations/supabase/client";
import { generateICS, icsFilename, type ICSEventInput } from "./generateICS";

type MemberScope =
  | { kind: "none" }
  | { kind: "all_active" }
  | { kind: "working_group"; slug: string };

export interface SendEventInviteArgs {
  event: ICSEventInput;
  subject: string;
  html: string;
  text?: string;
  memberScope?: MemberScope;
  guestEmails?: string[];
  pdf?: { bucket: string; path: string; filename?: string };
  idempotencyPrefix: string;
  requireRole?: string[];
}

export async function sendEventInvite(args: SendEventInviteArgs): Promise<{
  ok: boolean; sent: number; recipients: number; failures: { email: string; error: string }[];
}> {
  const ics = generateICS(args.event);
  const filename = icsFilename(args.event.title);

  const { data, error } = await supabase.functions.invoke("send-event-invite", {
    body: {
      subject: args.subject,
      html: args.html,
      text: args.text,
      memberScope: args.memberScope ?? { kind: "none" },
      guestEmails: args.guestEmails ?? [],
      pdf: args.pdf,
      ics,
      icsFilename: filename,
      idempotencyPrefix: args.idempotencyPrefix,
      requireRole: args.requireRole,
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

// Shared brand palette — mirrors supabase/functions/_shared/transactional-email-templates/_brand.ts
// so member-triggered event invite emails (Visits, Socials, Summons) match the
// React Email templates (almoner digest, poll opened, visitor invitation).
const BRAND = {
  navy: "#1B2A4A",
  gold: "#C9A432",
  body: "#2a2a2a",
  muted: "#666",
  hairline: "#e8e3d3",
  panel: "#fafaf7",
  bg: "#ffffff",
  fontStack: "Arial, sans-serif",
} as const;
const LOGO_URL =
  "https://bright-lodge-spark.lovable.app/__l5e/assets-v1/7caf0014-2e5c-4614-8622-ee60d204fdcc/weybridge-logo-navy-transparent.png";

export function formatEventEmailHtml(opts: {
  heading: string;
  intro: string;
  fields: { label: string; value: string }[];
  bodyHtml?: string;
  footer?: string;
}): string {
  const rows = opts.fields
    .map(
      (f) =>
        `<tr><td style="padding:6px 14px 6px 0;color:${BRAND.muted};font-size:14px;vertical-align:top;">${f.label}</td>` +
        `<td style="padding:6px 0;color:${BRAND.body};font-size:14px;"><strong style="color:${BRAND.navy};">${f.value}</strong></td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en" dir="ltr"><body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.fontStack};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:8px 0 16px;">
          <img src="${LOGO_URL}" width="120" height="120" alt="Weybridge Lodge crest" style="display:block;margin:0 auto;" />
          <h1 style="color:${BRAND.navy};font-size:24px;margin:12px 0 0;letter-spacing:0.5px;font-family:${BRAND.fontStack};">Weybridge Lodge</h1>
          <div style="color:${BRAND.gold};font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 12px;">No. 6787 — Province of Surrey</div>
        </td></tr>
        <tr><td style="padding:0 24px;">
          <h2 style="color:${BRAND.navy};font-size:22px;margin:0 0 12px;font-family:${BRAND.fontStack};">${opts.heading}</h2>
          <p style="color:${BRAND.body};font-size:14px;line-height:1.55;margin:0 0 14px;">${opts.intro}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="background:${BRAND.panel};border:1px solid ${BRAND.hairline};border-radius:4px;padding:8px 16px;margin:8px 0 16px;width:100%;">
            <tr><td style="padding:8px 4px;">
              <table role="presentation" cellspacing="0" cellpadding="0">${rows}</table>
            </td></tr>
          </table>
          ${opts.bodyHtml ?? ""}
          <p style="color:${BRAND.muted};font-size:13px;margin:20px 0 0;">A calendar invitation is attached — open it to add this event to your calendar.</p>
          <hr style="border:none;border-top:1px solid ${BRAND.hairline};margin:20px 0 10px;" />
          <p style="color:${BRAND.muted};font-size:13px;margin:18px 0 24px;">${opts.footer ?? "S&F, Weybridge Lodge No. 6787"}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
