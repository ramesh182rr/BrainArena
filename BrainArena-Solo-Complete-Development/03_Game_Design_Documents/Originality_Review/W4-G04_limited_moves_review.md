# Originality Review: W4-G04 Limited Moves (resource choreography)

- **Game ID/name:** W4-G04, *Limited Moves*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/pattern-universe/limited-moves/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Spending a fixed budget.
- Order-dependent costs.

## Reference products studied (research only)
- Resource-ordering puzzles are generic; no product was consulted.

## Distinct player interaction grammar
- Machines start for their current price and never stop; running gears make linked machines cheaper, boilers dearer, locks need a running neighbour.
- The budget equals the proven minimum (plus one in the intro), so the order is the whole puzzle.
- No toggling, wiring discovery or dials, which keeps it apart from Switch Challenge as its review asked.

## Distinct board/state model
- Machines (kind, base price, target flag, layout slot), links, budget, running list.
- `cheapest` runs Dijkstra over running sets for the exact minimum; a naive cheapest-target-first plan must cost more.

## Distinct objective and fail/success conditions
- Start every starred machine. Score: 100, bonus 50 minus 5 per undo/reset after the first and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded workshops with linked neighbours; rejected when the naive plan is nearly as cheap as the best.
- Tests: at least 120 seeds per band validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Gear, boiler, lock and machine icons are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (addressed):** distinct from Switch Challenge (monotonic activation with prices, not state toggling).
2. **Name (low-medium):** "Limited Moves" describes a constraint rather than the theme; consider "Workshop" naming.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
