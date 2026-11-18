# Originality Review: W6-G03 Object Illusion (property transformation)

- **Game ID/name:** W6-G03, *Object Illusion*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/creative-chaos/object-illusion/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Changing one property at a time to meet several constraints.
- Balance and counting goals.

## Reference products studied (research only)
- Property-change puzzles are generic; no product was consulted.

## Distinct player interaction grammar
- Objects on a balance scale have weight and warmth; one change alters one property by one step (or, from the advanced band, moves an object between pans).
- Goals combine (tilt, nothing hot on a pan, exactly N cold objects, X heaviest), so one change can help one goal and break another.

## Distinct board/state model
- Objects (item, weight, warmth, pan), goals, change budget.
- `solveIllusion` runs BFS for the exact minimum number of changes.

## Distinct objective and fail/success conditions
- Meet every goal within the budget. Score: 100, bonus 50 minus 10 per change over par and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded scenes whose goals all start unmet; par must fall in the band range.
- Tests: at least 60 seeds per band validated (most bands 150–200), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Object cards, weight dots, warmth tags and the scale are views and SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Name vs content (medium):** "Object Illusion" suggests visual illusions; the mechanic is property change. Consider a rename such as "Change of Heart".
2. **Inside the catalogue (low):** shares stepwise changes with Switch Challenge, but the goals are property constraints, not dial states.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
