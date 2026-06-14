# Collecting Real Member Testimonials

A short, practical workflow for gathering authentic quotes you can publish on
the homepage in place of the current placeholders.

## 1. Who to ask

Aim for **three voices that cover different life stages**:

- A newer member (joined in the last 1–3 years) — captures the "what surprised me" angle.
- A mid-career member — speaks to fitting Freemasonry around family/work.
- A long-serving member — speaks to friendship, charity, and personal growth.

Avoid asking only officers; visitor-facing quotes work best from "ordinary" members.

## 2. Prompts that produce good quotes

Email or speak to each member with **three short prompts**. Pick whichever
answer reads best.

1. *What were you nervous about before joining, and was that fear justified?*
2. *What's the single thing the Lodge has given you that you didn't expect?*
3. *If a friend asked "should I look into this?", what would you tell them?*

Keep replies to 35–60 words — long enough to feel real, short enough to read.

## 3. Consent (short version)

Send this once you have a quote you want to use:

> Hi [Name], thank you — we'd like to publish your words on the
> weybridgelodge.org.uk homepage attributed as **"[Display name], joined aged [X]"**.
> Are you happy for us to do that? You can ask us to remove it at any time.

Keep a record of the "yes" (email reply is fine). For GDPR purposes the lawful
basis is **consent**, freely given and revocable.

## 4. Format & publish

Put the approved quotes into `scripts/testimonials.csv` using the columns:

```
quote,name,role,joined
```

See `scripts/testimonials.template.csv` for an example. Then run:

```bash
node scripts/import-testimonials.mjs scripts/testimonials.csv
```

This rewrites `src/data/testimonials.ts`. Commit the change and the homepage
"In our members' own words" section updates instantly.

## 5. Tips for the final copy

- Use full Masonic style for names where appropriate ("W Bro. John Smith").
- Don't over-polish — small natural phrasings ("I almost didn't go") feel real.
- Avoid Masonic jargon a stranger wouldn't recognise.
- Refresh once a year so the section never feels stale.
