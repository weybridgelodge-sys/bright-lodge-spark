// Work that may finish after a webhook has replied 200 (fee lookups, emails).
// Same EdgeRuntime.waitUntil pattern as authEmailBrand.keepAlive. Never throws;
// failures are logged with console.error. Returns the promise so tests can await it.

export type RunAfterReply = (label: string, task: () => Promise<unknown>) => Promise<void>;

export const runAfterReply: RunAfterReply = (label, task) => {
  const p = Promise.resolve()
    .then(task)
    .then(() => undefined)
    .catch((e) => { console.error(`after-reply task failed: ${label}`, e instanceof Error ? e.message : e); });
  try {
    const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (rt && typeof rt.waitUntil === "function") rt.waitUntil(p);
  } catch (e) {
    console.error(`after-reply waitUntil unavailable: ${label}`, e);
  }
  return p;
};

/** Await the task in place (no HTTP reply to protect), still never throwing. */
export const runInline: RunAfterReply = async (label, task) => {
  try { await task(); } catch (e) { console.error(`inline task failed: ${label}`, e instanceof Error ? e.message : e); }
};
