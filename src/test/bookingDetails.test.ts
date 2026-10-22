import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canonicalSortCode, lodgePlaceholder, parseBookingDetails, paymentReference, signOff, validAccountNumber } from "@/lib/bookingDetails";

const live = parseBookingDetails({ lodge_name: "Sample Lodge", lodge_number: "1234", account_name: "Sample Lodge No 1234", sort_code: "11-22-33", account_number: "12345678", reference_pattern: "Dining + {surname}", cheque_payee: "Sample Lodge No 1234", sign_off_override: null });

describe("booking details", () => {
  it("sign-off derives from identity", () => expect(signOff(live)).toBe("Sincerely and Fraternally,\nWM Sample Lodge 1234"));
  it("override wins", () => expect(signOff({ ...live, signOffOverride: "Yours, the WM" })).toBe("Yours, the WM"));
  it("reference uses surname, else 'Your Surname'", () => {
    expect(paymentReference(live.referencePattern, "Smith")).toBe("Dining + Smith");
    expect(paymentReference(live.referencePattern, "")).toBe("Dining + Your Surname");
  });
  it("placeholder from unit", () => expect(lodgePlaceholder(live)).toBe("e.g. Sample Lodge No. 1234"));
  it("sort code accepts dashed or plain, stores canonical", () => {
    expect(canonicalSortCode("112233")).toBe("11-22-33");
    expect(canonicalSortCode("11-22-33")).toBe("11-22-33");
    expect(canonicalSortCode("11223")).toBeNull();
  });
  it("account number is 8 digits", () => { expect(validAccountNumber("12345678")).toBe(true); expect(validAccountNumber("1234567")).toBe(false); });
});
