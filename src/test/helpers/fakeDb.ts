// Tiny in-memory stand-in for the database client used by backend run.ts
// modules in tests. Supports only the query shapes those modules use.
type Row = Record<string, any>;
type Pred = (r: Row) => boolean;

export interface FakeDb {
  tables: Record<string, Row[]>;
  calls: { table: string; op: string; payload?: unknown }[];
  from: (t: string) => any;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>;
}

const sub = (obj: any, part: any): boolean =>
  obj != null && typeof obj === "object" && Object.entries(part).every(([k, v]) => obj[k] === v);

export function fakeDb(tables: Record<string, Row[]>, rpcs: Record<string, (a: any) => unknown> = {}): FakeDb {
  const db: FakeDb = {
    tables,
    calls: [],
    rpc: async (name, args) => ({ data: rpcs[name] ? rpcs[name](args) : null, error: null }),
    from(table: string) {
      const preds: Pred[] = [];
      let op: "select" | "update" | "upsert" | "insert" = "select";
      let payload: any = null;
      let order: { col: string; asc: boolean } | null = null;
      let lim: number | null = null;
      let single = false;
      let head = false;
      const rows = () => (db.tables[table] ??= []);
      const run = () => {
        if (op === "insert" || op === "upsert") {
          const list = Array.isArray(payload) ? payload : [payload];
          rows().push(...list.map((r: Row) => ({ ...r })));
          db.calls.push({ table, op, payload });
          return { data: null, error: null };
        }
        let out = rows().filter((r) => preds.every((p) => p(r)));
        if (op === "update") {
          out.forEach((r) => Object.assign(r, payload));
          db.calls.push({ table, op, payload });
          return { data: null, error: null };
        }
        if (order) {
          const { col, asc } = order;
          out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
        }
        if (lim != null) out = out.slice(0, lim);
        if (head) return { data: null, count: out.length, error: null };
        if (single) return { data: out[0] ?? null, error: null };
        return { data: out, error: null };
      };
      const q: any = {
        select: (_c?: string, o?: { head?: boolean }) => { if (o?.head) head = true; return q; },
        update: (p: Row) => { op = "update"; payload = p; return q; },
        upsert: (p: Row[]) => { op = "upsert"; payload = p; return q; },
        insert: (p: Row[]) => { op = "insert"; payload = p; return q; },
        eq: (c: string, v: unknown) => { preds.push((r) => r[c] === v); return q; },
        neq: (c: string, v: unknown) => { preds.push((r) => r[c] !== v); return q; },
        in: (c: string, v: unknown[]) => { preds.push((r) => v.includes(r[c])); return q; },
        is: (c: string, v: null) => { preds.push((r) => (r[c] ?? null) === v); return q; },
        not: (c: string, _o: string, _v: null) => { preds.push((r) => r[c] != null); return q; },
        lte: (c: string, v: any) => { preds.push((r) => r[c] != null && r[c] <= v); return q; },
        gte: (c: string, v: any) => { preds.push((r) => r[c] != null && r[c] >= v); return q; },
        lt: (c: string, v: any) => { preds.push((r) => r[c] != null && r[c] < v); return q; },
        contains: (c: string, v: Row) => { preds.push((r) => sub(r[c], v)); return q; },
        or: (expr: string) => {
          const parts = expr.split(",").map((s) => s.split("."));
          preds.push((r) => parts.some(([c, o, ...rest]) => {
            const v = rest.join(".");
            return o === "eq" ? String(r[c]) === v : o === "lt" ? r[c] != null && r[c] < v : false;
          }));
          return q;
        },
        order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return q; },
        limit: (n: number) => { lim = n; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: any, rej: any) => Promise.resolve().then(run).then(res, rej),
      };
      return q;
    },
  };
  return db;
}
