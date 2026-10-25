import { errorFor, errorId, type FieldError } from "@/lib/formErrors";

/** Message shown directly under its field; the field points here via aria-describedby. */
export function InlineFieldError({ errors, id }: { errors: FieldError[]; id: string }) {
  const msg = errorFor(errors, id);
  return msg ? <p id={errorId(id)} className="mt-1 font-sans text-sm text-destructive">{msg}</p> : null;
}
