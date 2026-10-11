import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInitialLoading } from "@/hooks/useInitialLoading";

describe("useInitialLoading", () => {
  it("shows the loader on first load", () => {
    const { result } = renderHook(() => useInitialLoading());
    expect(result.current[0]).toBe(true);
  });

  it("ignores later reloads so the page never blanks after a save", () => {
    const { result } = renderHook(() => useInitialLoading());
    act(() => result.current[1](false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(false);
  });
});
