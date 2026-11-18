# Hidden Truth (W1-G03): perspective switching

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W1-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W1-G03_hidden_truth_review.md`

## Rules
- Walk round the table with the arrows.
- Cross out statements that fail from some side.
- Pick the one that is always true.

## Generation and validation
- Seeded tables; the answer is a true invariant statement; half the decoys are tempting (true from the starting side).
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Pick the always-true statement. Score: 100, bonus 50 minus 20 per wrong pick and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
