import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Signer = { office: string; memberId: string | null; name: string };

/** "Will be signed by" — shown only when officer_signatures is on. Reads signature metadata only (never images). */
export default function SignersPanel({ year, signers }: { year: string; signers: Signer[] }) {
  const [onFile, setOnFile] = useState<Record<string, boolean> | null>(null);
  const ids = [...new Set(signers.map((s) => s.memberId).filter(Boolean))] as string[];
  const key = ids.join(",");
  useEffect(() => {
    let live = true;
    if (!ids.length) { setOnFile({}); return; }
    supabase.from("member_signatures").select("member_id").in("member_id", ids).eq("active", true)
      .then(({ data, error }) => { if (live) setOnFile(error ? null : Object.fromEntries((data ?? []).map((r) => [r.member_id, true]))); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const same = signers.length === 2 && signers[0].memberId && signers[0].memberId === signers[1].memberId;
  return (
    <section aria-labelledby="signers-h" className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 text-sm text-primary-foreground/90 space-y-2 break-words font-sans">
      <h2 id="signers-h" className="font-serif text-lg text-gold">Will be signed by</h2>
      <ul className="space-y-2">
        {signers.map((s) => (
          <li key={s.office} className="min-w-0">
            <span className="text-gold">{s.office}:</span>{" "}
            {s.memberId ? (
              <>
                {s.name || "—"}{" — "}
                {onFile === null ? "signature status not visible to you" : onFile[s.memberId] ? "signature on file" : "no signature on file — will be left blank"}
              </>
            ) : (
              <span>No {s.office} resolved for {year} — will be left blank</span>
            )}
          </li>
        ))}
      </ul>
      {same && <p>The same person holds both offices, so both lines carry the same signature.</p>}
      <p className="text-primary-foreground/80">Signatures are added on the server when you download or submit. Documents already issued are not changed.</p>
    </section>
  );
}
