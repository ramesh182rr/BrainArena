# Originality Review: W2-G02 Number Maze (arithmetic route planning)

- **Game ID/name:** W2-G02, *Number Maze*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-17 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/logic-kingdom/number-maze/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the puzzle genre:
- Path-finding on a grid without revisiting cells.
- Arithmetic on a running total.
- Reaching an exact target value.
- Bounds as a constraint.
- Parity as a gating rule.

## Reference products studied (research only)
- The blueprint's own `04_Level_Generation/examples/number_maze_generator.py`, an internal starter. Its fixed-order "apply every gate" design was **not** used, because it has no route choice.
- No commercial product was consulted.

## Distinct player interaction grammar
- One-tap steps between adjacent rooms, with a live preview of the resulting number on every legal room.
- Refused moves name the exact rule they break (range, exact division, lock parity, closed exit), and the room shakes. The player is never silently ignored.

## Distinct board/state model
- The board is a grid of gate, lock, sealed, start and exit rooms.
- The state is the route taken plus the number after each step, so undo restores both exactly.
- The exit is a value-gated goal, not merely a location.

## Distinct objective and fail/success conditions
- **Objective:** arrive at EXIT holding exactly the target, with every intermediate number inside the range.
- **No fail state:** dead ends are explained and can be undone.
- **Par:** the shortest route proven by the solver.

## Original level generation/content approach
- A planted self-avoiding route, with gates chosen to stay in bounds and locks matched to parity.
- Decoy gates and sealed rooms off the route.
- Exhaustive validation that rejects mazes with too many routes (too loose) or too few moves.
- Four authored tutorials and five curated fallbacks.

## Original story/dialogue/puzzle text confirmation
- All copy was written for this project.
- There is no story.

## Original visual assets and asset licences
- Rooms, trail and orb are drawn with React Native views and SVG made for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded.
- No third-party art or sound.

## UI layout not traced/copied
- The layout follows the project's own design system (value chips above a framed grid, round tool buttons below).

## Similarity risks found
1. **Genre convention (low risk):** "walk a grid, apply arithmetic, hit a target" is a common educational and puzzle pattern. The basic idea isn't distinctive; this implementation's combination of range limits, exact division, parity locks and no-revisit routing is its own.
2. **Inside the catalogue (low risk):** W2-G05 *Number Lock* (code inference) and W2-G03 *Sequence Master* also use numbers, but with different grammars (guess and feedback; sequence completion). There's no rules overlap.
3. **Name (low–medium risk):** "Number Maze" is descriptive and likely used by other apps. It is acceptable as a generic description, but a formal store and trademark check is still needed. Consider a more distinctive title if the search finds conflicts.

## Changes made to reduce similarity
- Added rules that change route planning (parity locks, exact division) in place of the starter's fixed sequence.
- Score is based on route length versus a solver-proven par, never on time.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable level, layout or asset was found. Run a name check before release.
