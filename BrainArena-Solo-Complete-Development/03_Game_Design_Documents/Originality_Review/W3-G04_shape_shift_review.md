# Originality Review: W3-G04 Shadow Tumble (formerly Shape Shift) (projection matching)

- **Game ID/name:** W3-G04, *Shadow Tumble* (formerly *Shape Shift*)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/spatial-dimension/shape-shift/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Mental rotation of 3D shapes.
- Orthographic projections (shadows).

## Reference products studied (research only)
- Mental-rotation tasks and projection puzzles are common in spatial-reasoning material; no product was consulted.

## Distinct player interaction grammar
- Three rotation buttons (turn, tilt, roll) rotate a small cube shape; the player matches its **shadow** to a target, not the shape itself.
- Expert bands require matching both a front and a side shadow at once.

## Distinct board/state model
- A polycube, its current orientation (one of 24), and target shadows.
- `solveShape` runs a breadth-first search over the 24 orientations for the exact par.

## Distinct objective and fail/success conditions
- Make the shadows match. Score: 100, bonus 50 at par, 30 within 2 extra rotations, 15 beyond; 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded polycube; targets come from a random reachable orientation whose shadow differs from the start; ambiguous or trivial cases are rejected.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Isometric cubes and shadows are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre convention (low):** mental rotation is a widely used task; matching shadows instead of shapes is the distinctive twist.
2. **Name (medium):** "Shape Shift" is a common phrase with existing apps; a store/trademark search is needed and a rename is likely.

## Follow-up (2026-11-19)
- **Renamed to *Shadow Tumble*.** The old name, *Shape Shift*, is a common store title. A web search found no game with the exact new title; the nearest results were unrelated or only loosely similar. This is not a trademark clearance: a formal store and trademark search is still required before release.
- The id `W3-G04` is unchanged, so saved progress is unaffected.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
