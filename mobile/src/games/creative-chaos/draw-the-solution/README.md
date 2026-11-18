# Plank & Spring (W6-G02): stroke engineering on a grid

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W6-G02)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W6-G02_draw_the_solution_review.md`

## Rules
- Draw from an anchor peg through neighbouring squares.
- Choose plank or spring, then drop the ball.
- Use as little ink as you can.

## Generation and validation
- Seeded floors with gaps, ledges and anchors; the ball must miss without a stroke; minimum ink by band.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Land the ball in the basket. Score: 100, bonus 50 minus 8 per extra square of ink, 6 per extra drop and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
