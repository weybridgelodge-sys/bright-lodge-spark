import { it, vi } from "vitest";
import { writeFileSync } from "fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { buildAccountsPackPdf } from "@/lib/treasurer/accountsPackPdf";
const A = (code: string, name: string, type: string, net: number) => ({ code, name, type, net });
const cur = { masonic_year: 2025, as_at: "2026-09-30", taken_at: "2026-09-28T23:00:00Z",
  income_expenditure: { income: 928898, expenditure: 1018677, surplus: -89779 },
  balance_sheet: { assets: 343954, liabilities: 545790, net_assets: -201836, fund_bf: -112057, surplus: -89779, total_funds: -201836 },
  trial_balance: { debit: 1503588, credit: 1503588 },
  accounts: [A("1000","Bank — Current Account","asset",343854),A("1200","Lodge Property at Cost","asset",100),A("2000","Creditors","liability",-446650),A("2100","Deferred Income — Subscriptions in Advance","liability",-81140),A("2200","Relief Chest Payable","liability",-18000),A("4000","Subscriptions","income",-500000),A("4100","Dining Income","income",-428898),A("5000","UGLE Fees","expense",60000),A("5210","GMC Dining Invoice","expense",958677)],
  comparative: { masonic_year: 2024, as_at: "2025-09-30", taken_at: "x",
    income_expenditure: { income: 635874, expenditure: 745944, surplus: -110070 },
    balance_sheet: { assets: 652593, liabilities: 764650, net_assets: -112057, fund_bf: -1987, surplus: -110070, total_funds: -112057 },
    trial_balance: { debit: 0, credit: 0 },
    accounts: [A("1000","Bank — Current Account","asset",652493),A("1200","Lodge Property at Cost","asset",100),A("2000","Creditors","liability",-446650),A("2100","Deferred Income — Subscriptions in Advance","liability",-300000),A("2200","Relief Chest Payable","liability",-18000),A("4000","Subscriptions","income",-194845),A("4100","Dining Income","income",-342944),A("4200","Charity Column / Collections","income",-31085),A("4300","Raffle Income","income",-67000),A("5000","UGLE Fees","expense",46080),A("5100","Provincial Grand Lodge Fees","expense",65866),A("5200","GMC Levy / Accommodation","expense",150340),A("5210","GMC Dining Invoice","expense",340100),A("5220","Relief Chest Donations Given","expense",17000),A("5300","Donations Given","expense",126558)] } };
it("render", async () => {
  const doc = await buildAccountsPackPdf({ draft: true, snap: cur as any, remarks: "Sample remarks.", round: null, certifiers: [] }, 2025, []);
  writeFileSync("/tmp/pack/draft.pdf", Buffer.from(doc.output("arraybuffer")));
}, 30000);
