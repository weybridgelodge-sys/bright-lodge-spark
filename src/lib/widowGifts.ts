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
