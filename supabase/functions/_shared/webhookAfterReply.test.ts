// Job BF: reply-first webhook work. Fake Supabase + fake fee/email deps; no network. Run: deno test
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { markBookingPaidWith } from "./markBookingPaidCore.ts";
import { eventsMarkPaid } from "./eventsMarkPaid.ts";
import { runAfterReply } from "./afterReply.ts";

type Row = Record<string, any>;
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Minimal in-memory query builder: select/update/insert with eq/neq/is filters. Each op yields once (simulated latency). */
function fakeDb(tables: Record<string, Row[]>) {
  const log: { table: string; op: string; changed: number }[] = [];
  const from = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "update" | "insert" = "select";
    let patch: Row = {};
    let returning = false;
    let head = false;
    const b: any = {
      select: (_c?: string, o?: { head?: boolean }) => { returning = true; head = !!o?.head; return b; },
      update: (p: Row) => { op = "update"; patch = p; return b; },
      insert: (p: Row) => { op = "insert"; patch = p; return b; },
      eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return b; },
      neq: (k: string, v: any) => { filters.push((r) => r[k] !== v); return b; },
      is: (k: string, v: any) => { filters.push((r) => (r[k] ?? null) === v); return b; },
      order: () => b, limit: () => b,
      async exec() {
        await tick();
        const rows = (tables[table] ??= []);
        if (op === "insert") { const r = { id: crypto.randomUUID(), ...patch }; rows.push(r); return { data: r, error: null }; }
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === "update") { hit.forEach((r) => Object.assign(r, patch)); log.push({ table, op, changed: hit.length }); return { data: returning ? hit.map((r) => ({ id: r.id })) : null, error: null }; }
        return { data: head ? null : hit, count: hit.length, error: null };
      },
      maybeSingle: async () => { const r = await b.exec(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (res: any, rej: any) => b.exec().then(res, rej),
    };
    return b;
  };
  return { from, log };
}

function counters(delayMs = 0, fail = false) {
  const c = { fee: 0, email: 0, feeDone: 0, emailDone: 0 };
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  return {
    c,
    syncFee: async () => { c.fee++; await wait(); if (fail) throw new Error("fake fee failure"); c.feeDone++; },
    sendEmails: async () => { c.email++; await wait(); c.emailDone++; },
  };
}

const session = { id: "cs_1", payment_intent: "pi_1", metadata: { booking_id: "b-0000001" } };
const meetingsDb = (status = "pending") => fakeDb({ bookings: [{ id: "b-0000001", environment: "sandbox", payment_status: status, paid_at: null }] });

/** Mirrors the webhook shape: await the handler, then reply. */
async function respond(fn: () => Promise<unknown>) { await fn(); return new Response(JSON.stringify({ received: true }), { status: 200 }); }

function captureErrors() {
  const errs: unknown[][] = []; const orig = console.error;
  console.error = (...a: unknown[]) => { errs.push(a); };
  return { errs, restore: () => { console.error = orig; } };
}

// ---------------- meetings (markBookingPaid) ----------------
Deno.test("meetings (a): 200 returns before a slow fee lookup and slow email finish", async () => {
  const db = meetingsDb(); const k = counters(300); const bg: Promise<void>[] = [];
  const t0 = Date.now();
  const res = await respond(() => markBookingPaidWith(db, session, "sandbox", { followUp: "after_reply", runner: (l, t) => { const p = runAfterReply(l, t); bg.push(p); return p; } }, { syncFee: k.syncFee, sendPaidEmails: k.sendEmails }));
  assertEquals(res.status, 200); await res.text();
  assert(Date.now() - t0 < 250, "reply should not wait for the 300 ms fee lookup");
  assertEquals(k.c.feeDone + k.c.emailDone, 0);
  await Promise.all(bg);
  assertEquals([k.c.feeDone, k.c.emailDone], [1, 1]);
});

Deno.test("meetings (b): two simultaneous deliveries → one paid update, one fee lookup, one email run", async () => {
  const db = meetingsDb(); const k = counters(); const deps = { syncFee: k.syncFee, sendPaidEmails: k.sendEmails };
  const r = await Promise.all([1, 2].map(() => markBookingPaidWith(db, session, "sandbox", {}, deps)));
  assertEquals(r.sort(), ["already_paid", "paid"]);
  assertEquals(db.log.filter((l) => l.changed > 0).length, 1);
  assertEquals([k.c.fee, k.c.email], [1, 1]);
});

Deno.test("meetings (b): simultaneous waitlisted deliveries keep status waitlisted, one winner", async () => {
  const db = meetingsDb("waitlisted"); const k = counters(); const deps = { syncFee: k.syncFee, sendPaidEmails: k.sendEmails };
  const r = await Promise.all([1, 2].map(() => markBookingPaidWith(db, session, "sandbox", {}, deps)));
  assertEquals(r.sort(), ["already_paid", "paid"]);
  assertEquals([k.c.fee, k.c.email], [1, 1]);
  const row = (await db.from("bookings").select("*").eq("id", "b-0000001").maybeSingle()).data;
  assertEquals(row.payment_status, "waitlisted"); assert(row.paid_at);
});

Deno.test("meetings (c): resend after completion does nothing", async () => {
  const db = meetingsDb(); const k = counters(); const deps = { syncFee: k.syncFee, sendPaidEmails: k.sendEmails };
  assertEquals(await markBookingPaidWith(db, session, "sandbox", {}, deps), "paid");
  assertEquals(await markBookingPaidWith(db, session, "sandbox", {}, deps), "already_paid");
  assertEquals([k.c.fee, k.c.email], [1, 1]);
});

Deno.test("meetings (d): background failure is logged, response unchanged", async () => {
  const db = meetingsDb(); const k = counters(0, true); const cap = captureErrors(); const bg: Promise<void>[] = [];
  try {
    const res = await respond(() => markBookingPaidWith(db, session, "sandbox", { followUp: "after_reply", runner: (l, t) => { const p = runAfterReply(l, t); bg.push(p); return p; } }, { syncFee: k.syncFee, sendPaidEmails: k.sendEmails }));
    assertEquals(res.status, 200); await res.text();
    await Promise.all(bg);
  } finally { cap.restore(); }
  assert(cap.errs.some((e) => String(e[0]).includes("after-reply task failed")));
});

Deno.test("meetings (e): expiry-job mode (default) awaits fee and emails before returning", async () => {
  const db = meetingsDb(); const k = counters(100);
  assertEquals(await markBookingPaidWith(db, session, "sandbox", {}, { syncFee: k.syncFee, sendPaidEmails: k.sendEmails }), "paid");
  assertEquals([k.c.feeDone, k.c.emailDone], [1, 1]);
});

Deno.test("meetings: sendEmails false (expiry self-check) skips emails but still syncs fee", async () => {
  const db = meetingsDb(); const k = counters();
  await markBookingPaidWith(db, session, "sandbox", { sendEmails: false }, { syncFee: k.syncFee, sendPaidEmails: k.sendEmails });
  assertEquals([k.c.fee, k.c.email], [1, 0]);
});

// ---------------- events (eventsMarkPaid) ----------------
const eventsDb = () => fakeDb({
  event_booking_payments: [{ id: "p1", booking_id: "e-0000001", kind: "full", status: "pending", amount_pence: 5000, fee_pence: 0 }],
  event_bookings: [{ id: "e-0000001", payment_plan: "full", payment_status: "pending" }],
  event_guest_course_choices: [],
});
const meta = { booking_id: "e-0000001", payment_id: "p1" };
function eventDeps(k: ReturnType<typeof counters>, runner?: any) {
  const c = { recompute: 0, token: 0 };
  return { c, deps: {
    recomputeBooking: async () => { c.recompute++; return { status: "paid" }; },
    ensureBalanceToken: async () => { c.token++; return "t"; },
    syncFees: k.syncFee, sendEmails: k.sendEmails, runner,
  } };
}

Deno.test("events (a): 200 returns before slow fee refresh and slow emails", async () => {
  const db = eventsDb(); const k = counters(300); const bg: Promise<void>[] = [];
  const { deps, c } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  const t0 = Date.now();
  const res = await respond(() => eventsMarkPaid(db, meta, "pi_e", 5000, deps));
  assertEquals(res.status, 200); await res.text();
  assert(Date.now() - t0 < 250);
  assertEquals(c.recompute, 1); assertEquals(k.c.feeDone + k.c.emailDone, 0);
  await Promise.all(bg);
  assertEquals([k.c.feeDone, k.c.emailDone], [1, 1]);
});

Deno.test("events (b): two simultaneous deliveries → one paid update, one fee refresh, one email run", async () => {
  const db = eventsDb(); const k = counters(); const bg: Promise<void>[] = [];
  const { deps, c } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  const r = await Promise.all([eventsMarkPaid(db, meta, "pi_e", 5000, deps), eventsMarkPaid(db, meta, "pi_e", 5000, deps)]);
  await Promise.all(bg);
  assertEquals(r.sort(), ["already_paid", "paid"]);
  assertEquals(db.log.filter((l) => l.table === "event_booking_payments" && l.changed > 0).length, 1);
  assertEquals([c.recompute, k.c.fee, k.c.email], [1, 1, 1]);
});

Deno.test("events (c): resend after completion does nothing", async () => {
  const db = eventsDb(); const k = counters(); const bg: Promise<void>[] = [];
  const { deps } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  assertEquals(await eventsMarkPaid(db, meta, "pi_e", 5000, deps), "paid");
  await Promise.all(bg);
  assertEquals(await eventsMarkPaid(db, meta, "pi_e", 5000, deps), "already_paid");
  assertEquals([k.c.fee, k.c.email], [1, 1]);
});

Deno.test("events (d): fee refresh throws -> 200, error logged, emails still run exactly once", async () => {
  const db = eventsDb(); const k = counters(0, true); const cap = captureErrors(); const bg: Promise<void>[] = [];
  const { deps } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  try {
    const res = await respond(() => eventsMarkPaid(db, meta, "pi_e", 5000, deps));
    assertEquals(res.status, 200); await res.text();
    await Promise.all(bg);
  } finally { cap.restore(); }
  assert(cap.errs.some((e) => String(e[0]).includes("Stripe fee refresh failed")));
  assertEquals([k.c.fee, k.c.email, k.c.emailDone], [1, 1, 1]);
});

Deno.test("events (d2): email failure after the reply is logged, response unchanged", async () => {
  const db = eventsDb(); const k = counters(); const cap = captureErrors(); const bg: Promise<void>[] = [];
  const { deps } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  deps.sendEmails = async () => { throw new Error("fake email failure"); };
  try {
    const res = await respond(() => eventsMarkPaid(db, meta, "pi_e", 5000, deps));
    assertEquals(res.status, 200); await res.text();
    await Promise.all(bg);
  } finally { cap.restore(); }
  assert(cap.errs.some((e) => String(e[0]).includes("after-reply task failed")));
});

Deno.test("events: deposit plan creates the balance link before the reply", async () => {
  const db = fakeDb({
    event_booking_payments: [{ id: "p1", booking_id: "e-0000001", kind: "deposit", status: "pending", amount_pence: 1000, fee_pence: 0 }],
    event_bookings: [{ id: "e-0000001", payment_plan: "deposit", payment_status: "pending" }],
    event_guest_course_choices: [],
  });
  const k = counters(300); const bg: Promise<void>[] = [];
  const { deps, c } = eventDeps(k, (l: string, t: any) => { const p = runAfterReply(l, t); bg.push(p); return p; });
  await eventsMarkPaid(db, meta, "pi_e", 1000, deps);
  assertEquals(c.token, 1); assertEquals(k.c.emailDone, 0);
  await Promise.all(bg);
});

Deno.test("runAfterReply hands the task to EdgeRuntime.waitUntil when present", async () => {
  let got = 0; (globalThis as any).EdgeRuntime = { waitUntil: () => { got++; } };
  try { await runAfterReply("t", async () => {}); } finally { delete (globalThis as any).EdgeRuntime; }
  assertEquals(got, 1);
});
