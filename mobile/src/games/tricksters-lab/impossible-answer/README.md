# Impossible Answer (W1-G02): constraint reframing

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/` (W1-G02)
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W1-G02_impossible_answer_review.md`

## Rules
- Flip rule cards to read them another way.
- Use a card on a pile; readings lock until Reset.
- Meet the goal within the move limit.

## Generation and validation
- Seeded cards, piles and goals; rejected unless exactly one non-literal reading works.
- Band profiles live in `logic.ts`; `validateLevel` re-checks structure, the start state and the fingerprint.

## Scoring
- Meet the goal. Score: 100, bonus 50 minus 4 per extra flip and 10 per hint.

## Files
- `logic.ts`: rules, generator, solver/validator, `GameModule`.
- `board.tsx`: board and `GameUi`.
- `__tests__/`: seeded levels per band, rules, runtime play-through and board render.
