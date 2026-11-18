# Originality Review: W6-G01 Gravity Lab (force-field tinkering)

- **Game ID/name:** W6-G01, *Gravity Lab*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/creative-chaos/gravity-lab/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Placing tools to steer a moving object.
- Deterministic simulation with Launch-and-watch feedback.

## Reference products studied (research only)
- "Place items, then run the machine" sandbox puzzles are a broad genre; no product or level was consulted.

## Distinct player interaction grammar
- Tap a square to cycle through the devices still in stock (attractor, repulsor, strong attractor), then Launch; the orb's path is drawn tick by tick.
- As the orb slips past the corner of an attractor it swings round towards it; nearing a repulsor's corner it veers away. Each device bends the orb once, and disagreeing devices cancel.
- Numbered gates must all be passed before the exit counts.

## Distinct board/state model
- Grid of walls, gates, exit, fixed devices; placed devices; a discrete simulator with loop detection.
- `solveLab` searches all placements for a fewest-device solution.

## Distinct objective and fail/success conditions
- Fly the orb through every gate to the exit. Score: 100, bonus 50 minus 10 per extra launch and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded: devices are placed randomly, the orb is simulated, and the exit and gates are taken from its path; levels where devices do not matter or that are already solved are rejected, and the solver confirms each level.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Orb, devices, gates and walls are SVG drawn for this project; devices carry +, − and ++ signs, not only colour.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (low):** place-and-run puzzles are common; the discrete corner-swing physics is this game's own.
2. **Catalogue wording (note):** the catalogue describes continuous gravity; this version is discrete for determinism and readability. Confirm the change.
3. **Name (low-medium):** run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
