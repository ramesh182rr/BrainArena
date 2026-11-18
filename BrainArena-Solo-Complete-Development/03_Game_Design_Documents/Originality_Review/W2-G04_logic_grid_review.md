# Originality Review: W2-G04 Logic Grid (multi-attribute deduction)

- **Game ID/name:** W2-G04, *Logic Grid*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/logic-kingdom/logic-grid/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Matching attributes across categories from clues.
- Unique-solution deduction.

## Reference products studied (research only)
- Attribute-matching logic puzzles are a public-domain genre; no puzzle book, app or text was consulted.

## Distinct player interaction grammar
- A row per traveller with item and time cells instead of the classic cross-grid of X/O marks.
- Clues tick green when satisfied and turn red when the entries break them: the conflict detector names exactly the broken clues.
- Clues can refer to a traveller by the item they carry ("the map carrier"), chaining categories.

## Distinct board/state model
- Travellers, items, times (ordered), clue list, the unique solution, player entries.
- `solveGrid` enumerates all permutations to prove exactly one solution.

## Distinct objective and fail/success conditions
- Fill every cell correctly. Score: 100, bonus 50 minus a little for many extra changes and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded solution; random true clues are added until unique, then pruned; levels where direct clues give everything away are rejected.
- Tests: at least 100 seeds per band validated (30 for Pallet Ferry's slow advanced/expert bands), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Text and design-system views only; names, items and times are original placeholder words.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (medium):** logic-grid puzzles are a long-established form. The row-entry layout and live conflict detector are this game's own; the clue grammar is generic.
2. **Name (medium):** "Logic Grid" is descriptive and common; consider a themed name.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
