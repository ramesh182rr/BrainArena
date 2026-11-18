# Originality Review: W3-G05 Echo Rooms (formerly Mirror World) (dual-board coordination)

- **Game ID/name:** W3-G05, *Echo Rooms* (formerly *Mirror World*)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/spatial-dimension/mirror-world/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Simultaneous control of two agents.
- Transformed controls (mirror, flip, rotate).
- Using walls to desynchronise.

## Reference products studied (research only)
- Dual-character "mirror" movement puzzles exist as a broad genre; no product or level was consulted.

## Distinct player interaction grammar
- One arrow pad moves two explorers in two rooms; the right one receives a transformed move: mirrored, flipped, rotated or alternating between moves.
- An explorer facing a wall stays put while the other moves; this "bump" is the main tool, and every generated room requires at least one.

## Distinct board/state model
- Two rooms, explorer positions, exits, the transform, and move parity for alternating transforms.
- `solveMirror` runs BFS over (left, right, parity) for the exact par.

## Distinct objective and fail/success conditions
- Both explorers on their exits at the same time. Score: 100, bonus 50 at par, 30 within 2 extra moves, 15 beyond; 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded rooms; levels whose solution needs no bump are rejected. Tutorials are hand-written in an original text format.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Explorers, rooms and exits are SVG/views drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (medium-low):** mirrored twin movement is a known puzzle idea; rotated and alternating transforms plus the guaranteed bump are the differentiators.
2. **Name (medium):** "Mirror World" is a common title phrase; a rename may be needed after a store search.

## Follow-up (2026-11-19)
- **Renamed to *Echo Rooms*.** The old name, *Mirror World*, is a common store title. A web search found no game with the exact new title; the nearest results were unrelated or only loosely similar. This is not a trademark clearance: a formal store and trademark search is still required before release.
- The id `W3-G05` is unchanged, so saved progress is unaffected.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
