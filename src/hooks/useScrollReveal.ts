import { useEffect, useRef } from "react";

/**
 * Lightweight IntersectionObserver-based reveal — replaces framer-motion
 * `whileInView` for simple fade/slide-in effects above and below the fold.
 * Adds the `is-visible` class once the element scrolls into view.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            io.unobserve(node);
          }
        });
      },
      { rootMargin: "-100px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return ref;
}
