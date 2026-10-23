import { loadDocIdentity } from "@/lib/docIdentity";
import { fetchCrestUrl } from "@/lib/pdfBrand";
import { brandFooterHtml, brandHeaderHtml, brandHeaderLines, type BrandIdentity } from "../../supabase/functions/_shared/transactional-email-templates/_brand";
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
  const ident = await loadDocIdentity();
  const ics = generateICS(args.event, ident);
  const filename = icsFilename(args.event.title, ident.lodgeName);

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

// Brand palette/header shared with the server emails (supabase/functions/_shared/transactional-email-templates/_brand.ts).
const BRAND = {
  navy: "#1B2A4A",
  body: "#2a2a2a",
  muted: "#666",
  hairline: "#e8e3d3",
  panel: "#fafaf7",
  bg: "#ffffff",
  fontStack: "Arial, sans-serif",
} as const;

/** Host lodge identity for invite emails: name/number/province from the lodge record, crest from Unit Setup (blank = no image). */
export async function loadEventEmailBrand(): Promise<BrandIdentity> {
  const [ident, crestUrl] = await Promise.all([loadDocIdentity(), fetchCrestUrl()]);
  return { crestUrl, lodgeName: ident.lodgeName, lodgeNumber: ident.lodgeNumber, provinceName: ident.provinceName };
}

export function formatEventEmailHtml(opts: {
  heading: string;
  intro: string;
  fields: { label: string; value: string }[];
  bodyHtml?: string;
  footer?: string;
  identity?: BrandIdentity | null;
}): string {
  const brandFooter = brandHeaderLines(opts.identity).footer;
  const rows = opts.fields
    .map(
      (f) =>
        `<tr><td style="padding:6px 14px 6px 0;color:${BRAND.muted};font-size:14px;vertical-align:top;">${f.label}</td>` +
        `<td style="padding:6px 0;color:${BRAND.body};font-size:14px;"><strong style="color:${BRAND.navy};">${f.value}</strong></td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.fontStack};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
        <tr><td>${brandHeaderHtml(opts.identity)}</td></tr>
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
          <p style="color:${BRAND.muted};font-size:13px;margin:18px 0 24px;">${opts.footer ?? (brandFooter ? `S&F, ${brandFooter}` : "S&F")}</p>
          ${brandFooterHtml(opts.identity)}
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
