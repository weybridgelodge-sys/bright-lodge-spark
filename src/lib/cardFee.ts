// Re-exports the one shared processing-fee rule used by the event booking backend.
export { calcCardFeePence, calcProcessingFeePence, eventFeePence, feeQuestion, feeLineItemName } from "../../supabase/functions/_shared/cardFee";
export type { EventPayMethod } from "../../supabase/functions/_shared/cardFee";
