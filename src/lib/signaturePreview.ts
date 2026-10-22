/** Turn a signature-preview invoke() result into a PNG Blob, or null if the response was not image bytes. */
export function previewToPng(data: unknown): Blob | null {
  if (data instanceof Blob) return data.size ? new Blob([data], { type: "image/png" }) : null;
  if (data instanceof ArrayBuffer) return data.byteLength ? new Blob([data], { type: "image/png" }) : null;
  return null;
}

/** "Signature on file, saved 22 Oct 2026" line. */
export function savedLine(createdAt: string | null, memberName?: string): string {
  const who = memberName ? ` for ${memberName}` : "";
  if (!createdAt) return `Signature on file${who}.`;
  const d = new Date(createdAt);
  const when = Number.isNaN(d.getTime()) ? "" : `, saved ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  return `Signature on file${who}${when}.`;
}
