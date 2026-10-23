import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";

describe("AlertDialogContent fits the phone screen", () => {
  it("has a viewport max-height, scrolls and pads for the safe area", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Send?</AlertDialogTitle>
          {Array.from({ length: 60 }, (_, i) => <p key={i}>Line {i}</p>)}
          <AlertDialogFooter><AlertDialogCancel className="min-h-[48px]">Cancel</AlertDialogCancel><AlertDialogAction>Send</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const cls = screen.getByRole("alertdialog").className;
    expect(cls).toMatch(/max-h-\[calc\(100dvh/);
    expect(cls).toContain("overflow-y-auto");
    expect(cls).toContain("env(safe-area-inset-bottom)");
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("min-h-[48px]");
  });

  it("the two send dialogs no longer override it and keep 48px buttons", () => {
    for (const f of ["ProvincialReturn", "InstallationReturn"]) {
      const src = readFileSync(`src/pages/members/admin/${f}.tsx`, "utf8");
      expect(src).not.toMatch(/AlertDialogContent className="[^"]*max-h-/);
      expect(src).toMatch(/AlertDialogCancel className="min-h-\[48px\]"/);
      expect(src).toMatch(/AlertDialogAction className="min-h-\[48px\]"/);
    }
  });
});
