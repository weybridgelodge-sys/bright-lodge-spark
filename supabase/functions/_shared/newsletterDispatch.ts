// Job AS-2: broadcast ordering. Every audience's emails go out first; archive PDFs are built
// and filed afterwards, one at a time, each isolated (a failure or slow PDF cannot affect
// another audience, the sends or the broadcast status). The crest is loaded once per send.

/** Runs `send` for every audience in order, then `afterSends` (status), then each archive job. */
export async function runSendsThenArchives<A, R extends { archive?: () => Promise<void> }>(opts: {
  audiences: A[];
  send: (a: A) => Promise<R>;
  afterSends?: (results: R[]) => Promise<void>;
  log?: (msg: string, e: unknown) => void;
}): Promise<R[]> {
  const log = opts.log ?? ((m, e) => console.error(m, e));
  const results: R[] = [];
  for (const a of opts.audiences) results.push(await opts.send(a));
  if (opts.afterSends) await opts.afterSends(results);
  for (const r of results) {
    if (!r.archive) continue;
    try { await r.archive(); } catch (e) { log("archive step failed (send unaffected):", e); }
  }
  return results;
}

/** Memoises one async load (e.g. the crest) for the whole send; failures resolve null. */
export function once<T>(load: () => Promise<T | null>): () => Promise<T | null> {
  let p: Promise<T | null> | null = null;
  return () => {
    if (!p) {
      try { p = Promise.resolve(load()).catch(() => null); } catch { p = Promise.resolve(null); }
    }
    return p;
  };
}
