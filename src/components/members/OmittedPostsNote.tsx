import { AlertTriangle } from "lucide-react";
import { omittedPosts } from "@/lib/summonsOfficers";

type Props = {
  officers: { label: string; member?: string | null }[];
  reps?: { role?: string | null; name?: string | null }[] | null;
};

/** Builder-only: posts left off the printed summons because they have no holder. */
export default function OmittedPostsNote({ officers, reps }: Props) {
  const { all, keyVacant } = omittedPosts(officers, reps);
  if (!officers.length || !all.length) return null;
  return (
    <div className="space-y-1 text-sm" data-testid="omitted-posts-note">
      {keyVacant.length > 0 && (
        <p role="alert" className="flex items-start gap-2 font-semibold text-destructive-foreground bg-destructive rounded px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>Key post with no holder: {keyVacant.join(", ")}. It will not appear on the summons.</span>
        </p>
      )}
      <p className="text-primary-foreground/80 break-words">Not printed (no holder): {all.join(", ")}</p>
    </div>
  );
}
