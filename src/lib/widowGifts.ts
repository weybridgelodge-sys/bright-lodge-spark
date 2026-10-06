export type GiftType = "hamper" | "cheque" | "voucher" | "other";
export const GIFT_LABEL: Record<GiftType, string> = { hamper: "Hamper", cheque: "Cheque", voucher: "Voucher", other: "Other" };

export type GiftLike = { gift_type: GiftType; amount: number | string | null; date_sent: string; description?: string | null };

const money = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** "Hamper 2024 · Cheque £50 2025" — oldest first. */
export function formatGiftHistory(gifts: GiftLike[]): string {
  return [...gifts]
    .sort((a, b) => a.date_sent.localeCompare(b.date_sent))
    .map((g) => {
      const label = g.gift_type === "other" && g.description ? g.description : GIFT_LABEL[g.gift_type];
      const amt = g.amount != null && g.amount !== "" ? ` ${money(Number(g.amount))}` : "";
      return `${label}${amt} ${g.date_sent.slice(0, 4)}`;
    })
    .join(" · ");
}

/**
 * Default "from" date for the widows report: the day after the last final report's end,
 * otherwise the last meeting date, otherwise 90 days before `today`.
 */
export function defaultWidowReportFrom(lastFinalTo: string | null, lastMeeting: string | null, today: string): string {
  if (lastFinalTo) {
    const d = new Date(`${lastFinalTo}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.toISOString().slice(0, 10);
    return s > today ? today : s;
  }
  if (lastMeeting && lastMeeting <= today) return lastMeeting;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().slice(0, 10);
}

export type FundingSource = "none" | "lodge_account" | "almoner_fund" | "raffle";
export const FUNDING_LABEL: Record<FundingSource, string> = { none: "Not linked", lodge_account: "Lodge account", almoner_fund: "Almoner fund", raffle: "Raffle" };

/** Map the dropdown value (a category or a collection id) to the two stored columns. */
export function fundingFromChoice(choice: string): { funding_source: FundingSource; funding_collection_id: string | null } {
  if (choice === "none" || choice === "lodge_account" || choice === "almoner_fund") return { funding_source: choice, funding_collection_id: null };
  return { funding_source: "raffle", funding_collection_id: choice };
}

/** Text after "Funded by: ". */
export function fundingLabel(source: FundingSource | null | undefined, raffleText?: string | null, hasCollection = false): string {
  const s = source ?? (hasCollection ? "raffle" : "none");
  if (s !== "raffle") return FUNDING_LABEL[s];
  if (raffleText) return `Raffle — ${raffleText}`;
  return hasCollection ? "Raffle collection" : "Raffle (collection removed)";
}

export type RaffleCollectionLike = { collection_date: string; event_title: string | null; net_amount: number | string | null };

/**
 * Text after the "Raffle — " prefix: "Christmas Meeting · 10 Dec 2025 · net £300.00".
 * With no meeting title the date and net amount stand alone — never a second "Raffle".
 */
export function raffleCollectionLabel(r: RaffleCollectionLike, formatDate: (d: string) => string): string {
  const title = r.event_title?.trim();
  const rest = `${formatDate(r.collection_date)} · net £${Number(r.net_amount ?? 0).toFixed(2)}`;
  return title ? `${title} · ${rest}` : rest;
}
