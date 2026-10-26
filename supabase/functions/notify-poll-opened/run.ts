// Poll-opened emails for ONE lodge: the signed-in caller's own unit (JOB CI).
// polls has no unit column, so the poll itself cannot be cross-checked.
import type { LodgeSettings } from "../_shared/lodgeSettingsResolve.ts";
import { brandFields } from "../_shared/units.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  send: (p: Record<string, unknown>) => Promise<{ ok: boolean; status: number; error?: unknown }>;
  push: (body: Record<string, unknown>) => Promise<unknown>;
  uuid?: () => string;
}

export async function runUnit(deps: Deps, unitId: string, lodge: LodgeSettings, poll: any, testRecipient: string | null) {
  const { db } = deps;
  const question = poll.question as string;
  const options = (poll.options as string[]) ?? [];
  const closesAt = poll.closes_at as string | null;
  const liveResults = poll.results_visibility === "live";
  const dashboardUrl = lodge.configuredSiteUrl ? `${lodge.configuredSiteUrl}/members/dashboard` : "";
  const isTest = !!testRecipient;
  let recipients: { email: string; user_id: string | null }[] = [];
  let activeIds: string[] = [];
  if (isTest) {
    recipients = [{ email: testRecipient!, user_id: null }];
  } else {
    const { data: actives } = await db.from("profiles").select("id,email").eq("status", "active").eq("unit_id", unitId);
    activeIds = (actives ?? []).map((p: any) => p.id);
    recipients = (actives ?? []).filter((p: any) => !!p.email).map((p: any) => ({ email: p.email, user_id: p.id }));
  }
  if (recipients.length === 0) return { sent: 0, recipients: 0 };

  const testRunId = isTest ? (deps.uuid ?? (() => crypto.randomUUID()))() : "";
  let sent = 0;
  const failures: { email: string; error: string }[] = [];
  for (const r of recipients) {
    const idempotencyKey = isTest ? `poll-open-${poll.id}-test-${testRunId}-${r.email}` : `poll-open-${poll.id}-${r.email}`;
    try {
      const res = await deps.send({
        templateName: "poll-opened", recipientEmail: r.email, idempotencyKey, unitId,
        templateData: { question, options, dashboardUrl, closesAt, liveResults, ...brandFields(lodge) },
      });
      if (!res.ok) throw new Error(String((res.error as any) ?? `HTTP ${res.status}`));
      sent++;
    } catch (e) {
      failures.push({ email: r.email, error: (e as Error).message });
    }
  }
  // Push to this lodge's active members only (was all_active, which spans every lodge).
  if (!isTest && activeIds.length) {
    try {
      await deps.push({ member_ids: activeIds, title: "New poll", body: question, data: { type: "poll", poll_id: poll.id } });
    } catch (e) {
      console.error("notify-poll-opened push failed (email flow unaffected)", (e as Error).message);
    }
  }
  return { test: isTest, sent, recipients: recipients.length, failures };
}
