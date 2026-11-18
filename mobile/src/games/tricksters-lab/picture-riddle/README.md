# Picture Riddle (W1-G04): visual relationship mapping

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W1-G04)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W1-G04_picture_riddle_review.md`

## Rules
- Study the example cards.
- Apply the same rule to the new card.
- The reveal names each change.

## Generation and validation
- Seeded rules with 1–4 changes by band; distractors are near-misses that get one attribute wrong.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Pick the right picture. Score: 100, bonus 50 minus 20 per wrong pick and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
