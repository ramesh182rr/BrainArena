# Cattice (W2-G01): symbol constraint lattice

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W2-G01)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W2-G01_meow_grid_review.md`

## Rules
- Each row, column and outlined region holds every cat exactly once.
- Linked echo cells must hold the same cat.
- Every grid has exactly one solution.

## Generation and validation
- Seeded Latin square, perturbed regions with a connectivity check, echo pairs chosen from the solution, then given removal under the uniqueness solver. Three tutorials; fallbacks use a reviewed fixed seed.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Complete the grid. Score: 100, bonus 50 minus 3 per wrong placement (max 30) and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
