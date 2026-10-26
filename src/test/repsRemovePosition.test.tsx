// Job DC: Remove shows only on inactive representative posts for editors, and calls the RPC.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const rpcCalls: any[] = [];
const toastErr = vi.fn();
let rpcResult: any = { data: { deleted_appointments: 1 }, error: null };
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (m: string) => toastErr(m) } }));
const POS = [
  { key: "rep_old", label: "Old Rep", order_index: 10, category: "representative", unit_id: "A", active: false },
  { key: "rep_live", label: "Live Rep", order_index: 20, category: "representative", unit_id: "A", active: true },
];
const APPTS = [{ id: "1", position_key: "rep_old", member_id: null, display_name: "X", lodge_year: 2025 }];
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string): any => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q, limit: () => Promise.resolve({ data: [], error: null }),
      then: (res: any) => Promise.resolve({ data: table === "officer_positions" ? POS : APPTS, error: null }).then(res),
    };
    return q;
  };
  return { supabase: { from: (t: string) => chain(t), rpc: async (fn: string, args: any) => { rpcCalls.push({ fn, args }); return rpcResult; } } };
});
import RepresentativesBoard from "@/components/members/officers/RepresentativesBoard";

beforeEach(() => { rpcCalls.length = 0; toastErr.mockReset(); rpcResult = { data: { deleted_appointments: 1 }, error: null }; });

describe("Representatives: remove post", () => {
  it("only inactive posts get Remove, for editors", async () => {
    render(<RepresentativesBoard year={2026} members={[]} canEdit />);
    expect(await screen.findByRole("button", { name: "Remove Old Rep" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove Live Rep" })).toBeNull();
  });
  it("hidden for users who cannot edit", async () => {
    render(<RepresentativesBoard year={2026} members={[]} canEdit={false} />);
    await screen.findByText("Live Rep");
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  });
  it("confirm names the appointment count and calls the RPC", async () => {
    render(<RepresentativesBoard year={2026} members={[]} canEdit />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove Old Rep" }));
    expect(await screen.findByText(/deletes the post and 1 appointment record for this lodge\. This cannot be undone\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove post" }));
    await waitFor(() => expect(rpcCalls).toEqual([{ fn: "delete_representative_position", args: { _key: "rep_old" } }]));
  });
  it("shows the server's refusal message", async () => {
    rpcResult = { data: null, error: { message: "This post appears in a submitted return; leave it deactivated" } };
    render(<RepresentativesBoard year={2026} members={[]} canEdit />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove Old Rep" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove post" }));
    await waitFor(() => expect(toastErr).toHaveBeenCalledWith("This post appears in a submitted return; leave it deactivated"));
  });
});
