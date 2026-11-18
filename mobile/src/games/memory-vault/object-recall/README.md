# Object Recall (W5-G02): recall in context

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W5-G02)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W5-G02_object_recall_review.md`

## Rules
- Read the story cards.
- Do the quick break.
- Answer where, who and which-first questions.

## Generation and validation
- Seeded stories with distinct objects and places; answers are checked by replay.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Answer enough questions for every story. Score: 100, bonus up to 50 from accuracy, minus 15 per miss and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
