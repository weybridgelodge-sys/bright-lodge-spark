// Register meeting ↔ public booking page link. The link is the event id;
// the stored booking key is derived from the linked event in the database
// (never typed, never invented here).
export type LinkableEvent = { id: string; title: string; event_date: string; archived_at?: string | null };

/** Fields the register dialog writes for the link. No booking key is ever sent. */
export const meetingLinkPayload = (lodgeEventId: string | null) => ({ lodge_event_id: lodgeEventId || null });

export function linkedPageLine(lodgeEventId: string | null, events: LinkableEvent[]): string {
  const e = lodgeEventId ? events.find((x) => x.id === lodgeEventId) : null;
  if (e) return `Linked booking page: ${e.title}`;
  return lodgeEventId ? "Linked booking page: (event not found)" : "Not linked to a public booking page";
}
