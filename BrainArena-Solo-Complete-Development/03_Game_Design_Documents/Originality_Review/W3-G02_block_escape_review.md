# Originality Review: W3-G02 Pallet Ferry (formerly Block Escape) (layered cargo choreography)

- **Game ID/name:** W3-G02, *Pallet Ferry* (formerly *Block Escape*)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/spatial-dimension/block-escape/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Sliding pieces on a grid with blocking.
- Carrying (one piece riding another).

## Reference products studied (research only)
- Sliding-block "escape" puzzles (e.g. cars leaving a parking grid) are a known genre; this design avoids their exit-by-sliding-a-blocker structure. No product or level was consulted.

## Distinct player interaction grammar
- Two layers: crates walk on the floor; platforms slide over floor and pits and carry riding crates.
- Crates cannot cross pits on foot, so the puzzle is about ferrying, not clearing a lane.
- Floor crates block platforms; platforms never push. Tap a riding crate twice to select its platform.

## Distinct board/state model
- Tiles (floor, wall, pit, dock), platforms with sizes, crates (gold crate first).
- `solveEscape` runs breadth-first search over piece positions for the exact par (numeric state keys).

## Distinct objective and fail/success conditions
- Dock the gold crate. Score: 100, bonus 50 at par down to 10 for many extra moves; 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded warehouses with a pit band between the gold crate and the dock; par must fall in the band range. Expert generation can take about a second on a fast machine.
- Tests: at least 100 seeds per band validated (30 for Block Escape's slow advanced/expert bands), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Warehouse tiles, pallets and crates are SVG drawn for this project; the gold crate carries a triangle mark.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (medium):** sliding-block puzzles are crowded. The two-layer carry rule and pits are the differentiators.
2. **Name (medium):** "Block Escape" resembles many store titles; a rename is likely.
3. **Performance (note):** expert generation is the slowest in the catalogue; consider precomputing a level pack.

## Follow-up (2026-11-19)
- **Renamed to *Pallet Ferry*.** The old name, *Block Escape*, is a common store title. A web search found no game with the exact new title; the nearest results were unrelated or only loosely similar. This is not a trademark clearance: a formal store and trademark search is still required before release.
- The id `W3-G02` is unchanged, so saved progress is unaffected.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
