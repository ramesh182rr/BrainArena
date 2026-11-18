# Originality Review: W3-G03 Path Finder (living path construction)

- **Game ID/name:** W3-G03, *Path Finder*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/spatial-dimension/path-finder/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Path planning on a grid.
- State that changes with every move (toggling neighbours).

## Reference products studied (research only)
- Neighbour-toggling grid puzzles (lights-out style) and maze walking are generic; no product or level was consulted.

## Distinct player interaction grammar
- You walk the garden yourself; every step toggles the hedges beside the square you land on, so the route reshapes the terrain.
- Stones never change; flowers (advanced+) toggle their whole row.
- Generated gardens must be shorter or only solvable thanks to the shifting (a frozen-hedge walk must not do as well).

## Distinct board/state model
- Ground tiles (grass, hedge up/down, stone, flower, fountain), walker position, history.
- `solveGarden` runs BFS over (position, hedge states) for the exact par.

## Distinct objective and fail/success conditions
- Reach the fountain. Score: 100, bonus 50 at par down to 10; 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded gardens from the left edge to the right edge with hedges, stones and flowers; par must fall in the band range.
- Tests: at least 120 seeds per band validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Hedges, stones, flowers and the fountain are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (low):** toggle mechanics are generic; combining them with walking is uncommon.
2. **Name (medium):** "Path Finder" is a common phrase; run a store check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
