# Originality Review: W6-G05 Impossible Machine (causal machine repair by rhythm)

- **Game ID/name:** W6-G05, *Impossible Machine*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/creative-chaos/impossible-machine/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Function composition; non-commuting operations.
- Matching a target output.

## Reference products studied (research only)
- Machine-building puzzles are a broad genre; no product was consulted.

## Distinct player interaction grammar
- An 8-count rhythm passes through a chain of slots; modules (delay, echo, thin, flip, mirror) each reshape it.
- Place modules from a tray (some spares), then Run; the output is compared with the target beat by beat.
- No dials, switches or hidden wiring, so it stays apart from Switch Challenge, as its review asked.

## Distinct board/state model
- Input and target rhythms (8-bit), inventory, slots.
- `solveMachine` enumerates orderings; every level has exactly one module order that works and no shorter chain.

## Distinct objective and fail/success conditions
- Match the target rhythm. Score: 100, bonus 50 minus 8 per run after the first and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded input with 3–5 beats; a random chain defines the target; levels with several distinct solutions are rejected.
- Tests: at least 120 seeds per band validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Module icons and rhythm bars are SVG/views drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (addressed):** distinct from Switch Challenge.
2. **Accessibility (note):** rhythms are visual only for now; when audio exists, playing the rhythm would help (and must stay optional).
3. **Name (low-medium):** run a check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
