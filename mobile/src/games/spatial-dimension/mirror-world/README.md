# Echo Rooms (W3-G05): dual-board coordination

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W3-G05)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W3-G05_mirror_world_review.md`

## Rules
- One arrow moves both explorers; the right one gets a transformed move.
- Walls stop an explorer while the other keeps moving.
- Both must stand on their exits together.

## Generation and validation
- Seeded rooms; levels whose solution needs no bump are rejected. Tutorials are hand-written in an original text format.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Both explorers on their exits at the same time. Score: 100, bonus 50 at par, 30 within 2 extra moves, 15 beyond; 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
