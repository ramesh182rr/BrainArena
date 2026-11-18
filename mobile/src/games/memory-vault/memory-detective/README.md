# Memory Detective (W5-G01): scene reconstruction by relationships

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W5-G01)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W5-G01_memory_detective_review.md`

## Rules
- Study the room.
- Rebuild it on the larger map; shifting is fine.
- Pairs count when left/right and above/below both match.

## Generation and validation
- Seeded scenes that avoid all objects in one row or column; pass mark 75% of pairs.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Rebuild every room. Score: 100, bonus up to 50 from pair accuracy, minus 15 per miss and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
