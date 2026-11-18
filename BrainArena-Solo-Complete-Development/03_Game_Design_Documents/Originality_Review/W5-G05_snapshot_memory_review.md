# Originality Review: W5-G05 Snapshot Memory (spatial map memory)

- **Game ID/name:** W5-G05, *Snapshot Memory*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/memory-vault/snapshot-memory/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Spatial memory for object locations.
- Building a whole map from partial views.

## Reference products studied (research only)
- Location-memory tasks are a broad category; no product was consulted.

## Distinct player interaction grammar
- The room is never shown whole: a small camera window sweeps across it in a snake while a mini-map shows where it is looking.
- Afterwards the player places each object on a blank map (pick from a tray, tap a square; tap a placed object to pick it up).
- Partial credit: exact square 2 points, one square off (diagonals too) 1. Reaching 60% passes.

## Distinct board/state model
- Room size, window size, object positions per (seed, round, attempt), frames, the player's placements.

## Distinct objective and fail/success conditions
- Map every room. Score: 100, bonus up to 50 from accuracy on passed rooms, minus 15 per miss and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded rooms with distinct objects (distinct shapes first); every square is covered by at least one frame (validated).
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Reuses the project's own SVG shapes from What's Changed?; mini-map and window are views.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (low):** location memory is generic; the sweeping window is the distinctive element.
2. **Inside the catalogue (low):** shares shapes with What's Changed?; the tasks differ (placing from partial views vs spotting differences).
3. **Name (low-medium):** run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
