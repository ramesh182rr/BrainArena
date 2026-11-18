# Balance Alchemy (W6-G03): property transformation

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W6-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W6-G03_object_illusion_review.md`

## Rules
- Tap an object and change one property.
- Meet every goal at once.
- Stay within the change budget.

## Generation and validation
- Seeded scenes whose goals all start unmet; par must fall in the band range.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Meet every goal within the budget. Score: 100, bonus 50 minus 10 per change over par and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
