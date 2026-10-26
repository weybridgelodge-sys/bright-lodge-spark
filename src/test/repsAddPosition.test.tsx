// Job CT: Add position works with no lodge known in the browser; the database fills the lodge.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const inserts: Record<string, unknown>[] = [];
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string): any => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q,
      limit: () => Promise.resolve({ data: [{ order_index: 330 }], error: null }),
      insert: (row: Record<string, unknown>) => { if (table === "officer_positions") inserts.push(row); return Promise.resolve({ error: null }); },
      then: (res: any) => Promise.resolve({ data: [], error: null }).then(res),
    };
    return q;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

import RepresentativesBoard from "@/components/members/officers/RepresentativesBoard";

describe("Representatives: add position", () => {
  it("enables Add once a name is typed with no lodge known, and sends no unit_id", async () => {
    render(<RepresentativesBoard year={2026} members={[]} canEdit />);
    const btn = screen.getByRole("button", { name: "Add position" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("New representative position"), { target: { value: "Province Rep" } });
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(inserts).toHaveLength(1));
    expect(inserts[0]).not.toHaveProperty("unit_id");
    expect(inserts[0]).toMatchObject({ label: "Province Rep", category: "representative", order_index: 340 });
    expect(String(inserts[0].key)).toMatch(/^rep_province_rep_/);
  });
});
