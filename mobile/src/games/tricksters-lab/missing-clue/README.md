# The Missing Clue (W1-G01): evidence reconstruction

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W1-G01)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W1-G01_missing_clue_review.md`

## Rules
- Place every event on the timeline so all clue cards are satisfied.
- Clues: before / right after / N apart / first / last / not first / not last / gap; a witness clue counts only from the witness's arrival.
- Exactly one order works.

## Generation and validation
- Seeded: a random true order is drawn, clues are added until the order is unique, then redundant clues are pruned. Three tutorials; fallbacks use a reviewed fixed seed.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Fill the timeline so every clue holds. Score: 100, bonus 50 minus 2 per move beyond twice the event count and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
