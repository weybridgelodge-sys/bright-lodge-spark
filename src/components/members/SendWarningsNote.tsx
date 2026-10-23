// Shared "N warning(s) still showing" line for official send-confirm dialogs.
// Solid destructive token pair (>= 4.5:1 in both themes) so it reads on any dialog background.
export const SEND_WARNING_CLASS = "rounded-sm bg-destructive px-3 py-2 font-sans font-semibold text-destructive-foreground";

export default function SendWarningsNote({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <p role="alert" className={SEND_WARNING_CLASS}>
      {count} warning{count === 1 ? " is" : "s are"} still showing on the page.
    </p>
  );
}
