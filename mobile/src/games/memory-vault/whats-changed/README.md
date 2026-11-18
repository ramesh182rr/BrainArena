# What's Changed? (W5-G03): visual change detection

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W5-G03)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W5-G03_whats_changed_review.md`

## Rules
- Study the scene, then mark every square that changed.
- A moved or swapped shape changes two squares.
- A miss explains the changes and gives a fresh scene.

## Generation and validation
- Seeded scenes with distinct shape/colour objects; profiles control grid (3×3 to 5×5), objects, change count and kinds. Three tutorials teach one idea each.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Spot every change in every round. Score: 100, bonus 50 minus 15 per miss and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: 200 seeds per band, rules, runtime play-through and board render.
