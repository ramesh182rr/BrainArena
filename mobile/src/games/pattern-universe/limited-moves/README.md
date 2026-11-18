# Limited Moves (W4-G04): resource choreography

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W4-G04)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W4-G04_limited_moves_review.md`

## Rules
- Start every ★ machine within the energy budget.
- Running gears make linked machines 1 cheaper; boilers 1 dearer.
- Locks start only after a linked machine runs.

## Generation and validation
- Seeded workshops with linked neighbours; rejected when the naive plan is nearly as cheap as the best.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Start every starred machine. Score: 100, bonus 50 minus 5 per undo/reset after the first and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
