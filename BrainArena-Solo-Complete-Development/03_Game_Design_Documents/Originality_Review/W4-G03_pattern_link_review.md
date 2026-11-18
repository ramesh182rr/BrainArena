# Originality Review: W4-G03 Pattern Link (motif weaving)

- **Game ID/name:** W4-G03, *Pattern Link*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/pattern-universe/pattern-link/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Inferring a successor rule (grammar) from examples.
- Path planning under a sequence constraint.

## Reference products studied (research only)
- Rule-inference and sequence-path puzzles are generic; no product was consulted.

## Distinct player interaction grammar
- Walk a grid of motif tiles; each step must follow a hidden grammar of which motif may come next.
- The grammar is shown only through example trails (a rule card in the intro); refused steps explain what cannot follow.
- Advanced: two rules alternate on odd and even steps. Expert: two successors per motif on a larger board.

## Distinct board/state model
- Motif grid, grammar (rules per step parity), example trails, start, goal, path.
- `solveWeave` runs BFS over (cell, step parity) for the exact par.

## Distinct objective and fail/success conditions
- Reach the goal. Score: 100, bonus 50 minus 4 per refused step, 3 per step over par and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded grammar cycles, random motif grid, start on the left edge and goal on the right; from standard up the grammar must force a detour.
- Tests: at least 100 seeds per band validated (30 for Pallet Ferry's slow advanced/expert bands), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Motif glyphs (sun, moon, leaf, wave, star) are SVG drawn for this project, each with its own silhouette.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (low):** shares rule inference with Rule Breaker, but here the rule drives movement, not classification.
2. **Name (low-medium):** run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
