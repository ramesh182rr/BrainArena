# Originality Review: W5-G02 Object Recall (recall in context)

- **Game ID/name:** W5-G02, *Object Recall*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/memory-vault/object-recall/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Episodic memory of a short narrative.
- Interference from a distraction task.

## Reference products studied (research only)
- Story-recall quizzes are generic; no product or text was consulted.

## Distinct player interaction grammar
- A story is shown card by card (self-paced), then a short unscored distraction (tap the bigger number), then questions.
- Questions ask where an object ended up, who handled it last, or which was put away first.
- A miss reviews every answer and tells a fresh story.

## Distinct board/state model
- Story events (put/move), questions with stored answers that the validator re-derives by replaying the story.

## Distinct objective and fail/success conditions
- Answer enough questions for every story. Score: 100, bonus up to 50 from accuracy, minus 15 per miss and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded stories with distinct objects and places; answers are checked by replay.
- Tests: at least 120 seeds per band validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Reuses the object icons from Memory Detective; all story text is generated from original templates.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Clinical framing (low):** story-recall tests exist in clinical settings; the game avoids any assessment language, as the PRD requires.
2. **Name (medium):** generic; run a check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
