// Regression test: typing in a budget line must NOT remount the input.
// The Group component is defined at module level; if it were recreated inside
// AnnualBudgetTab's render body, every keystroke would remount the subtree,
// dropping focus and scroll position.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnnualBudgetTab from "./AnnualBudgetTab";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const accounts = [
  { id: "acc-inc", code: "1000", name: "Subscriptions", account_type: "income" },
  { id: "acc-exp", code: "5000", name: "Dining Costs", account_type: "expense" },
];
const pots = [{ id: "pot-1", label: "Almoners" }];

vi.mock("@/lib/treasurer/reports", () => ({
  money: (p: number) => `£${(p / 100).toFixed(2)}`,
  fetchAccounts: vi.fn(async () => accounts),
}));
vi.mock("@/lib/treasurer/budget", () => ({
  budgetYearOptions: () => [{ start: "2025-10-01", end: "2026-09-30", label: "2025/26" }],
  fetchAnnualBudget: vi.fn(async () => null),
  fetchBudgetLines: vi.fn(async () => []),
  fetchReserveBudgetLines: vi.fn(async () => []),
  saveAnnualBudget: vi.fn(async () => null),
  upsertBudgetLine: vi.fn(async () => null),
  upsertReserveBudgetLine: vi.fn(async () => null),
}));
vi.mock("@/lib/treasurer/subscriptionSettings", () => ({
  fetchReservePots: vi.fn(async () => pots),
}));

describe("AnnualBudgetTab input focus stability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the same input DOM node focused across keystrokes", async () => {
    render(<AnnualBudgetTab canEdit />);
    const input = await screen.findByLabelText("1000 — Subscriptions");
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "5" } });
    expect((input as HTMLInputElement).value).toBe("5");
    expect(document.activeElement).toBe(input);
    // Same DOM node = no remount
    const afterFirst = screen.getByLabelText("1000 — Subscriptions");
    expect(afterFirst).toBe(input);

    fireEvent.change(input, { target: { value: "50" } });
    expect((input as HTMLInputElement).value).toBe("50");
    expect(document.activeElement).toBe(input);
    expect(screen.getByLabelText("1000 — Subscriptions")).toBe(input);
  });

  it("preserves scroll position while typing", async () => {
    render(<AnnualBudgetTab canEdit />);
    const input = await screen.findByLabelText("5000 — Dining Costs");
    input.focus();
    const yBefore = window.scrollY;
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.change(input, { target: { value: "12" } });
    expect(window.scrollY).toBe(yBefore);
    expect((input as HTMLInputElement).value).toBe("12");
    expect(document.activeElement).toBe(input);
  });

  it("still updates the running group total from typed values", async () => {
    render(<AnnualBudgetTab canEdit />);
    const input = await screen.findByLabelText("1000 — Subscriptions");
    await waitFor(() => expect(screen.getAllByText("£0.00").length).toBeGreaterThan(0));
    fireEvent.change(input, { target: { value: "123.45" } });
    await waitFor(() => expect(screen.getByText("£123.45")).toBeInTheDocument());
  });
});
