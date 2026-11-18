# Star Thread (W4-G01): signal constellation

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W4-G01)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W4-G01_dot_connect_review.md`

## Rules
- Start at START, tap stars along links, finish at BEACON.
- Light every star once; no hops between same-colour stars.
- Arrowed links are one-way; tap a lit star to rewind.

## Generation and validation
- Jittered star layouts, shortest non-crossing links, random colours; the colour rule must remove solutions; one-way links follow a valid route.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Light every star ending at the beacon. Score: 100, bonus 50 minus 4 per rewind after the first and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
