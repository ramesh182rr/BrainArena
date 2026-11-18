# Originality Review: W4-G01 Star Thread (formerly Dot Connect) (signal constellation)

- **Game ID/name:** W4-G01, *Star Thread* (formerly *Dot Connect*)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/pattern-universe/dot-connect/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Visiting every node of a graph once (Hamiltonian path).
- Adjacency constraints by colour; directed edges.

## Reference products studied (research only)
- Connect-the-dots and path-through-every-node puzzles are generic; no product was consulted.

## Distinct player interaction grammar
- Tap stars in order to draw the route along faint links; tap a lit star to rewind to it.
- Colour rule: never hop between two stars of the same colour (each colour also has an inner mark).
- One-way links from the advanced band. No tiles, rotation or crossings, as the Volt Courier review requested.

## Distinct board/state model
- Stars with positions and colours, non-crossing links, source and beacon, the route.
- `solveConstellation` counts valid routes; standard and above have exactly one.

## Distinct objective and fail/success conditions
- Light every star ending at the beacon. Score: 100, bonus 50 minus 4 per rewind after the first and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Jittered star layouts, shortest non-crossing links, random colours; the colour rule must remove solutions; one-way links follow a valid route.
- Tests: at least 100 seeds per band validated (30 for Pallet Ferry's slow advanced/expert bands), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Stars, links and arrows are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (addressed):** distinct from Volt Courier (no tile rotation, no crossings).
2. **Name (medium):** "Dot Connect" is a very common title; a rename is likely.

## Follow-up (2026-11-19)
- **Renamed to *Star Thread*.** The old name, *Dot Connect*, is a common store title. A web search found no game with the exact new title; the nearest results were unrelated or only loosely similar. This is not a trademark clearance: a formal store and trademark search is still required before release.
- The id `W4-G01` is unchanged, so saved progress is unaffected.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
