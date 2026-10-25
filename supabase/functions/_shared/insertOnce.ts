// Refund rows are protected by unique indexes (uq_journal_entries_booking_refund,
// ux_dues_payments_refund). A retried or concurrent Stripe delivery that hits one
// is "already posted", never a failure, so the webhook still replies 200.
export const isUniqueViolation = (err: unknown): boolean =>
  !!err && typeof err === "object" && (err as { code?: unknown }).code === "23505";

export type InsertOnceResult<T> = { status: "inserted"; data: T } | { status: "already_posted" };

export async function insertOnce<T>(
  label: string,
  run: () => PromiseLike<{ data: T; error: unknown }>,
): Promise<InsertOnceResult<T>> {
  const { data, error } = await run();
  if (!error) return { status: "inserted", data };
  if (isUniqueViolation(error)) {
    console.log(`${label}: already posted (unique rule), skipping`);
    return { status: "already_posted" };
  }
  throw error;
}
