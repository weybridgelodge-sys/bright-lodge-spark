import { describe, it, expect } from "vitest";
import { changedFields, clearedRequired, patchFor, REQUIRED_UNIT_FIELDS } from "@/lib/unitSetupForm";

const loaded = { cheque_payee: "Sample Lodge No 1", card_wording: "", facebook_url: "https://f.invalid/x", account_name: "Acc" };

describe("Unit Setup save safety", () => {
  it("an untouched section has nothing to save", () => {
    expect(changedFields(loaded, { ...loaded }, ["cheque_payee", "card_wording"])).toEqual([]);
  });
  it("only changed fields are sent", () => {
    const cur = { ...loaded, card_wording: "Pay by card" };
    const ch = changedFields(loaded, cur, ["cheque_payee", "card_wording"]);
    expect(patchFor(cur, ch, { cheque_payee: "cheque_payee", card_wording: "card_wording" })).toEqual({ card_wording: "Pay by card" });
  });
  it("clearing an optional link is sent as a deliberate clear", () => {
    const cur = { ...loaded, facebook_url: "" };
    const ch = changedFields(loaded, cur, ["facebook_url"]);
    expect(patchFor(cur, ch, { facebook_url: "facebook_url" })).toEqual({ facebook_url: "" });
    expect(clearedRequired(cur, ch, [...REQUIRED_UNIT_FIELDS])).toEqual({});
  });
  it("clearing the cheque payee is refused", () => {
    const cur = { ...loaded, cheque_payee: "  " };
    expect(clearedRequired(cur, changedFields(loaded, cur, ["cheque_payee"]), [...REQUIRED_UNIT_FIELDS]).cheque_payee).toBeTruthy();
  });
  it("required fields are cheque payee, account name, sort code and account number", () => {
    expect([...REQUIRED_UNIT_FIELDS].sort()).toEqual(["account_name", "account_number", "cheque_payee", "sort_code"]);
  });
});
