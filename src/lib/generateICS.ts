// RFC 5545 iCalendar generator for lodge event invitations.
// Output is a plain string ready for base64 encoding as an email attachment.

export interface ICSEventInput {
  title: string;
  description?: string;
  location: string;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601 (defaults to +2h)
  organizerEmail?: string;
  organizerName?: string;
  uid?: string;
}

const LODGE_DOMAIN = "weybridgelodge.org.uk";
const DEFAULT_ORGANIZER_EMAIL = `secretary@${LODGE_DOMAIN}`;
const DEFAULT_ORGANIZER_NAME = "Weybridge Lodge Secretary";

// ICS requires DTSTART/DTSTAMP as UTC in the compact form YYYYMMDDTHHMMSSZ
function toUtcICS(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// RFC 5545 §3.3.11 — escape TEXT values
function escapeText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold lines >75 octets, per RFC 5545 §3.1
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

function makeUid(): string {
  try {
    return (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function icsFilename(title: string): string {
  return `${slugify(title) || "event"}-weybridge-lodge.ics`;
}

export function generateICS(event: ICSEventInput): string {
  const uid = event.uid ?? `${makeUid()}@${LODGE_DOMAIN}`;
  const start = new Date(event.startTime);
  const end = event.endTime
    ? new Date(event.endTime)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const organizerEmail = event.organizerEmail ?? DEFAULT_ORGANIZER_EMAIL;
  const organizerName = event.organizerName ?? DEFAULT_ORGANIZER_NAME;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weybridge Lodge No 6787//Lodge Portal//EN",
    "CALSCALE:GREGORIAN",
    // PUBLISH keeps this as an add-to-calendar file rather than a meeting
    // request, which prevents some mail clients from rendering an invite panel
    // above the actual message body.
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcICS(new Date().toISOString())}`,
    `DTSTART:${toUtcICS(start.toISOString())}`,
    `DTEND:${toUtcICS(end.toISOString())}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.location)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  lines.push(
    `ORGANIZER;CN=${escapeText(organizerName)}:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return lines.map(fold).join("\r\n");
}
