/**
 * Shared portal form-field style for navy surfaces. Token choices are listed
 * in FIELD_TOKENS so src/test/fieldContrast.test.ts can compute WCAG ratios
 * straight from src/index.css. Change both together.
 */
export const FIELD_TOKENS = {
  background: "navy",
  text: "cream",
  placeholder: "gold-light",
  border: "gold",
  borderAlpha: 0.7,
  label: "gold",
  disabledBackground: "navy-light",
} as const;

export const fieldCls =
  "w-full min-h-[44px] rounded-md border border-gold/70 bg-navy px-3 py-2 text-base md:text-sm text-cream " +
  "placeholder:text-gold-light placeholder:opacity-100 [color-scheme:dark] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-dark focus-visible:border-gold focus-visible:bg-navy-light " +
  "disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-navy-light disabled:border-dashed read-only:border-dashed";

export const fieldLabelCls = "block text-xs uppercase tracking-wider text-gold";
export const fieldHintCls = "mt-1 block text-xs normal-case tracking-normal text-cream";
