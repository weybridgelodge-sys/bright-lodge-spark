/** Placement result reported by the signing functions. */
export type SignedPlacement = { secretary: boolean; worshipful_master: boolean };

/** Plain-words line describing which stored signatures are really on a generated return. */
export function signaturesSummary(on: boolean, signed?: SignedPlacement | null): string {
  if (!on || !signed) return "Signatures are left blank.";
  const { secretary: s, worshipful_master: w } = signed;
  if (s && w) return "Signatures: Secretary and Worshipful Master added from the stored signatures.";
  if (w) return "Signatures: Worshipful Master added; the Secretary has none on file, so that box is blank.";
  if (s) return "Signatures: Secretary added; the Worshipful Master has none on file, so that box is blank.";
  return "Signatures: none on file; boxes left blank.";
}

export const SIGNATURES_ON_HELP = "Stored signatures are added where on file; a missing one leaves its box blank.";
