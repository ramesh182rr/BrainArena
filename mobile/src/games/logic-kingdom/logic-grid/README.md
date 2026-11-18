# Logic Grid (W2-G04): multi-attribute deduction

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W2-G04)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W2-G04_logic_grid_review.md`

## Rules
- Each traveller has one item and one time; read the clues.
- Tap a cell and choose a value; values are exclusive per column.
- Clues tick green or turn red live. One answer exists.

## Generation and validation
- Seeded solution; random true clues are added until unique, then pruned; levels where direct clues give everything away are rejected.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Fill every cell correctly. Score: 100, bonus 50 minus a little for many extra changes and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
