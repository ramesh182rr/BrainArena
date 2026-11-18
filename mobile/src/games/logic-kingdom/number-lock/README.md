# Number Lock (W2-G05): code inference by closeness

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W2-G05)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W2-G05_number_lock_review.md`

## Rules
- Set each tumbler and press Try code.
- ● exact, ◐ one away, ○ further off; advanced and expert report counts only.
- Expert locks add a sum clue. Tries are unlimited.

## Generation and validation
- Seeded random code (no single-digit codes); par must fall inside the band range; expert sum clues must leave at least 40 candidate codes.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Open the lock. Score: 100, bonus 50 minus 8 per try beyond par + 1 and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
