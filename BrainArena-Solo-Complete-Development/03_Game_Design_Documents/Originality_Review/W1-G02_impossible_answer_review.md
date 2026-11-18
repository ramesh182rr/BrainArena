# Originality Review: W1-G02 Impossible Answer (constraint reframing)

- **Game ID/name:** W1-G02, *Impossible Answer*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/tricksters-lab/impossible-answer/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Reinterpreting an instruction (lateral thinking).
- Reachability with a move limit.

## Reference products studied (research only)
- Lateral-thinking riddles are a broad tradition; no puzzle text or product was consulted. The rule pairs (remove from one pile / every pile, merge / split, add / double) were written for this project.

## Distinct player interaction grammar
- Every rule card has a literal and a reframed reading; Flip reading switches it. Readings lock after the first move; Reset unlocks them.
- Use a card, then tap a pile of sparks. Exactly one set of readings makes the goal reachable, and never the literal one.

## Distinct board/state model
- Starting piles, double-sided rule cards, goal (exact total, pile count or equal piles), move limit.
- `workingReadings` tries every combination of readings with breadth-first search over piles.

## Distinct objective and fail/success conditions
- Meet the goal. Score: 100, bonus 50 minus 4 per extra flip and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded cards, piles and goals; rejected unless exactly one non-literal reading works.
- Tests: at least 60 seeds per band validated (most bands 150–200), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Sparks and cards are views and SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Variety (note):** harder bands mostly produce exact-total goals; adding more goal kinds would vary them.
2. **Name (low-medium):** run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
