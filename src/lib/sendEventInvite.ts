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
        `<tr><td style="padding:4px 12px 4px 0;color:#5b5b5b;font-size:14px;vertical-align:top;">${f.label}</td>` +
        `<td style="padding:4px 0;color:#111;font-size:14px;"><strong>${f.value}</strong></td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f4ee;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e0d3;border-radius:4px;">
        <tr><td style="padding:24px 28px;background:#0b1d3a;color:#d4b26a;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;">Weybridge Lodge No. 6787</div>
          <h1 style="margin:6px 0 0 0;font-size:22px;color:#fff;">${opts.heading}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;color:#222;font-size:15px;line-height:1.55;">
          <p style="margin:0 0 16px 0;">${opts.intro}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 16px 0;">${rows}</table>
          ${opts.bodyHtml ?? ""}
          <p style="margin:20px 0 0 0;color:#5b5b5b;font-size:13px;">A calendar invitation is attached — open it to add this event to your calendar.</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf7f1;color:#5b5b5b;font-size:12px;border-top:1px solid #e5e0d3;">
          ${opts.footer ?? "S&F, Weybridge Lodge No. 6787"}
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
