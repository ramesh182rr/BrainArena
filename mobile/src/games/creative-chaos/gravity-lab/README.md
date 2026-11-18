# Gravity Lab (W6-G01): force-field tinkering

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W6-G01)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W6-G01_gravity_lab_review.md`

## Rules
- The orb drifts one square per tick from its start.
- Attractors swing it round their corner; repulsors push it away. Each device acts once.
- Pass every gate, then reach the exit.

## Generation and validation
- Seeded: devices are placed randomly, the orb is simulated, and the exit and gates are taken from its path; levels where devices do not matter or that are already solved are rejected, and the solver confirms each level.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Fly the orb through every gate to the exit. Score: 100, bonus 50 minus 10 per extra launch and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
