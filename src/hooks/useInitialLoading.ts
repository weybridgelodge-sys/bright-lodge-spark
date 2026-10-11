import { useCallback, useRef, useState } from "react";

/**
 * Drop-in replacement for `useState(true)` as a page/list loading flag.
 * `setLoading(true)` only takes effect before the first load has finished,
 * so refreshes after a save keep the content mounted and the user's scroll
 * position and focus are preserved (no "jump to top").
 */
export function useInitialLoading(initial = true) {
  const [loading, setState] = useState(initial);
  const loadedOnce = useRef(!initial);
  const setLoading = useCallback((value: boolean) => {
    if (value && loadedOnce.current) return;
    if (!value) loadedOnce.current = true;
    setState(value);
  }, []);
  return [loading, setLoading] as const;
}
