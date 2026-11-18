# Originality Review: W2-G01 Meow Grid (symbol constraint lattice)

- **Game ID/name:** W2-G01, *Meow Grid*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/logic-kingdom/meow-grid/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Latin-square constraints (each symbol once per row, column and region).
- Irregular regions.
- Unique-solution logic puzzles.

## Reference products studied (research only)
- Latin-square and region-based number-placement puzzles are a public-domain genre; no product, grid or text was consulted.

## Distinct player interaction grammar
- Cats instead of digits, chosen from a palette and placed by tap; wrong placements are counted (not blocked) and only lower the bonus.
- **Echo pairs:** linked cells in different regions must hold the same cat, a constraint outside the standard grid genre.

## Distinct board/state model
- N×N grid, irregular connected regions made by perturbing regular boxes, echo pairs, and givens.
- A budgeted backtracking solver proves uniqueness; givens are removed while the grid stays unique, down to a band minimum.

## Distinct objective and fail/success conditions
- Complete the grid. Score: 100, bonus 50 minus 3 per wrong placement (max 30) and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded Latin square, perturbed regions with a connectivity check, echo pairs chosen from the solution, then given removal under the uniqueness solver. Three tutorials; fallbacks use a reviewed fixed seed.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Cat faces are SVG drawn for this project; each cat also carries its own mark on its face and a spoken name, so colour is never the only cue.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre convention (medium-low):** the core is a Latin-square-with-regions puzzle, which is a broad public-domain form. Echo pairs and cat symbols are the differentiators, but the base grammar is familiar.
2. **Name (low-medium):** check the store for cat-themed grid puzzles with similar names.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
