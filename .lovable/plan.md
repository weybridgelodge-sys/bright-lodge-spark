# Welfare Board: three-level sort

## Findings

**1. "Active note": what the data supports.** Each member card can show three markers today. None of them is called a "note":
- **System flag**: the member has at least one automatic Welfare Log entry that hasn't been dismissed. This matches your guess, and it's the only marker that comes from the new Tier 1/Tier 2 work.
- **"Worth a call?"**: the attendance-pattern badge. It goes quiet once a genuine contact is logged.
- **Follow-up overdue**: a manual entry whose follow-up date has passed with no newer contact.

One thing to know: the System flag stays until the Almoner presses Dismiss. Logging a real contact doesn't remove it, because that contact only silences the "worth a call?" badge. So if "active note" means System flag, a member the Almoner has already rung stays at the top until the entry is dismissed. That fits the idea that Dismiss means "done with it".

**Proposal:** "active note" = an undismissed System flag, as you guessed. If you'd rather it meant *any* of the three markers, that's a one-line change. Tell me before I build.

**2. RAG order.** Worst first: Red, then Amber, then Green. The board already does this, and members with no status count as Green. No reason to change it.

**3. Alphabetical order.** Elsewhere in the portal (the Member Directory and the Member Admin Users list), names are sorted by **surname, then first name**. The Welfare Board is the odd one out: it currently sorts by first or preferred name. I'll switch it to surname then first name to match.

## What changes
The board order becomes:
1. Members with an active System flag first.
2. Within each group, Red, then Amber, then Green.
3. Within each colour, surname, then first or preferred name.

This is one ordered list, not three separate ones. Nothing else on the board changes.

## Checks
- A unit test for the sort rule: the active note beats RAG, RAG beats name, and surname sorts before first name.
- The existing 320px Almoner test.
- The full test suite.

## Technical
- Pull the comparator out into `src/lib/welfareBoardSort.ts` (pure function) and use it in `AlmonerPortal.tsx` `sorted`, with `systemFlags` as a dependency.
- Add the test in `src/test/welfareBoardSort.test.ts`.
