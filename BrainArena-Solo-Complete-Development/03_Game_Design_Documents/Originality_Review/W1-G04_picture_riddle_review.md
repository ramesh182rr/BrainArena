# Originality Review: W1-G04 Picture Riddle (visual relationship mapping)

- **Game ID/name:** W1-G04, *Picture Riddle*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/tricksters-lab/picture-riddle/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Visual analogy (A is to B as C is to ?).
- Rule induction over several attributes.

## Reference products studied (research only)
- Picture analogies appear widely, including in aptitude-test material; the game avoids any test framing. No item bank or product was consulted.

## Distinct player interaction grammar
- Example cards show a picture turning into another under one hidden rule (shape step, colour step, copies, size).
- Pick what the rule makes from a new card; the reveal names every change.
- Shape and colour order is shown as rows, so "one step along" is explicit.

## Distinct board/state model
- Rule (per-attribute change), examples, query, options.
- Fairness check: every rule consistent with the examples gives the same answer.

## Distinct objective and fail/success conditions
- Pick the right picture. Score: 100, bonus 50 minus 20 per wrong pick and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded rules with 1–4 changes by band; distractors are near-misses that get one attribute wrong.
- Tests: at least 60 seeds per band validated (most bands 150–200), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Reuses the project's shape glyphs from What's Changed?.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Test-style framing (medium-low):** visual analogies resemble aptitude tests; keep copy playful and never call it a measure of ability.
2. **Name (medium):** "Picture Riddle" is generic; run a check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
