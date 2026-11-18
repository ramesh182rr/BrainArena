# Path Finder (W3-G03): living path construction

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W3-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W3-G03_path_finder_review.md`

## Rules
- Tap a neighbouring square to step.
- Each step toggles the hedges next to where you land; raised hedges block.
- Flowers toggle their row; stones never change.

## Generation and validation
- Seeded gardens from the left edge to the right edge with hedges, stones and flowers; par must fall in the band range.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Reach the fountain. Score: 100, bonus 50 at par down to 10; 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
