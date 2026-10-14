// Re-exports the one shared card-fee rule used by the event booking backend.
export { calcCardFeePence, eventFeePence } from "../../supabase/functions/_shared/cardFee";
export type { EventPayMethod } from "../../supabase/functions/_shared/cardFee";
