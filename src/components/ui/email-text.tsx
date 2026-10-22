import { Fragment, type ReactNode } from "react";

const EMAIL_RE = /([^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]*[^\s@<>()"',;:.])/g;

/** One address: may break only right after "@"; each half stays whole. */
export function EmailText({ email, className = "" }: { email: string | null | undefined; className?: string }) {
  const v = (email ?? "").trim();
  if (!v) return null;
  const at = v.indexOf("@");
  if (at < 0) return <span className={`whitespace-nowrap ${className}`}>{v}</span>;
  return (
    <span className={className}>
      <span className="whitespace-nowrap">{v.slice(0, at + 1)}</span><wbr />
      <span className="whitespace-nowrap">{v.slice(at + 1)}</span>
    </span>
  );
}

/** Wrap any addresses inside free text so they break only after "@". Non-strings pass through. */
export function withEmailBreaks(node: ReactNode): ReactNode {
  if (typeof node !== "string" || !node.includes("@")) return node;
  return node.split(EMAIL_RE).map((part, i) =>
    i % 2 === 1 ? <EmailText key={i} email={part} /> : <Fragment key={i}>{part}</Fragment>,
  );
}
