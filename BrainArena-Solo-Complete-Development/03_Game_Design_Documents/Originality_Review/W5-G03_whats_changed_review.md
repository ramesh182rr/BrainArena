# Originality Review: W5-G03 What's Changed? (visual change detection)

- **Game ID/name:** W5-G03, *What's Changed?*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/memory-vault/whats-changed/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Change detection from short-term visual memory.
- Increasing scene size and change count.

## Reference products studied (research only)
- "Spot the difference" puzzles are a public-domain form; this game works from memory (the before scene is hidden), and no product or image was consulted.

## Distinct player interaction grammar
- Study a scene for a few seconds (or skip ahead with "I'm ready"), then mark every changed square on the new scene and Check.
- Change kinds: vanish, appear, move (two squares), swap (two squares), recolour.
- A miss shows before and after side by side with a sentence per change, then a fresh scene.

## Distinct board/state model
- Before and after scenes per (seed, round, attempt); changes touch disjoint squares, so the changed set is exactly where the scenes differ.

## Distinct objective and fail/success conditions
- Spot every change in every round. Score: 100, bonus 50 minus 15 per miss and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded scenes with distinct shape/colour objects; profiles control grid (3×3 to 5×5), objects, change count and kinds. Three tutorials teach one idea each.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Shapes (circle, square, triangle, diamond, star, hexagon) are SVG drawn for this project; shape always differs from colour as a cue, though a recolour change relies on colour (screen-reader labels name the colour).
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (addressed):** the Sequence Recall review asked that W5-G03 be about scene differences, not item order. It is: there is no ordering step.
2. **Accessibility (medium):** recolour changes need colour vision. Consider a setting that swaps recolour for a pattern change.
3. **Name (medium):** a common phrase; run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
