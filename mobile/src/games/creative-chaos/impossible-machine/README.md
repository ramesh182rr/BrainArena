# Impossible Machine (W6-G05): causal machine repair by rhythm

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W6-G05)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W6-G05_impossible_machine_review.md`

## Rules
- Pick a module, tap a slot, then Run.
- Each module reshapes the rhythm; order matters.
- Match the target; some modules are spares.

## Generation and validation
- Seeded input with 3–5 beats; a random chain defines the target; levels with several distinct solutions are rejected.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Match the target rhythm. Score: 100, bonus 50 minus 8 per run after the first and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
