# Snapshot Memory (W5-G05): spatial map memory

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W5-G05)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W5-G05_snapshot_memory_review.md`

## Rules
- Watch a window sweep across the room; the mini-map shows where.
- Place every object on the blank map.
- Exact 2 points, one square off 1; reach the pass mark.

## Generation and validation
- Seeded rooms with distinct objects (distinct shapes first); every square is covered by at least one frame (validated).
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Map every room. Score: 100, bonus up to 50 from accuracy on passed rooms, minus 15 per miss and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
