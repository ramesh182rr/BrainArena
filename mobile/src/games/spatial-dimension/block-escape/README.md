# Pallet Ferry (W3-G02): layered cargo choreography

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W3-G02)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W3-G02_block_escape_review.md`

## Rules
- Get the gold crate onto the dock.
- Crates cannot step into pits; platforms carry riding crates across.
- Floor crates block platforms; platforms never push.

## Generation and validation
- Seeded warehouses with a pit band between the gold crate and the dock; par must fall in the band range. Expert generation can take about a second on a fast machine.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Dock the gold crate. Score: 100, bonus 50 at par down to 10 for many extra moves; 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
