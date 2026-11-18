# Pattern Link (W4-G03): motif weaving

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W4-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W4-G03_pattern_link_review.md`

## Rules
- Walk from start to goal one neighbour at a time.
- Each step must follow the motif grammar; infer it from the examples.
- Advanced levels alternate two rules by step parity.

## Generation and validation
- Seeded grammar cycles, random motif grid, start on the left edge and goal on the right; from standard up the grammar must force a detour.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Reach the goal. Score: 100, bonus 50 minus 4 per refused step, 3 per step over par and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
