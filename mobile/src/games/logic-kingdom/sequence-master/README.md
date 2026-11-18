# Sequence Master (W2-G03): rule composition

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W2-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W2-G03_sequence_master_review.md`

## Rules
- Each sequence repeats a short cycle of steps (+n, −n, ×n).
- Fill every blank; all blanks are uniquely determined.
- Check when ready; wrong checks only lower the bonus.

## Generation and validation
- Seeded cycle and start value per round; blanks are placed and re-checked until forced. Three tutorials; fallbacks use a reviewed fixed seed.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Fill every blank correctly. Score: 100, bonus 50 minus 10 per wrong check and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `ui/SequenceMasterBoard.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
