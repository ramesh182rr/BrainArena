# Chain Reaction (W4-G05): pulse timing

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W4-G05)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W4-G05_chain_reaction_review.md`

## Rules
- Rotate nodes (within the budget), then Fire.
- Relays fire one tick after a pulse arrives, slow relays two; splitters fire both ways.
- Twin locks need two pulses in the same tick. Light every star.

## Generation and validation
- Seeded boards; twin-lock bands place a constructed symmetric motif so the twin is reachable and must be timed. Three tutorials; fallbacks use a reviewed fixed seed.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Light every star. Score: 100, bonus 50 minus 5 per rotation over par, 10 per extra fire and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
