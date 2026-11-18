# Shape Shift (W3-G04): projection matching

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W3-G04)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W3-G04_shape_shift_review.md`

## Rules
- Turn, tilt and roll the cube shape.
- Match its front shadow (and side shadow in expert) to the target.
- Par is the fewest rotations.

## Generation and validation
- Seeded polycube; targets come from a random reachable orientation whose shadow differs from the start; ambiguous or trivial cases are rejected.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Make the shadows match. Score: 100, bonus 50 at par, 30 within 2 extra rotations, 15 beyond; 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
