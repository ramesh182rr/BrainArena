# Originality Review: W6-G02 Draw the Solution (stroke engineering on a grid)

- **Game ID/name:** W6-G02, *Draw the Solution*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/creative-chaos/draw-the-solution/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Drawing a support to redirect a moving object.
- Limited material (ink).

## Reference products studied (research only)
- Drawing-physics puzzles are a known genre; this version is a deterministic grid, not free-form physics. No product or level was consulted.

## Distinct player interaction grammar
- Draw one continuous stroke square by square from an anchor peg, then drop the ball; tap the end square to erase.
- Two materials: planks (solid) and springs (a falling ball bounces up two squares).
- The ball falls, rolls, and turns back at walls; outcomes are deterministic and replayable.

## Distinct board/state model
- Cells (air, wall, anchor, basket), ball start and direction, ink, allowed materials, stroke.
- `solveDraw` tries every stroke up to the ink limit for the proven minimum.

## Distinct objective and fail/success conditions
- Land the ball in the basket. Score: 100, bonus 50 minus 8 per extra square of ink, 6 per extra drop and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded floors with gaps, ledges and anchors; the ball must miss without a stroke; minimum ink by band.
- Tests: at least 60 seeds per band validated (most bands 150–200), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Walls, pegs, planks, springs, ball and basket are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Catalogue wording (note):** the catalogue says "elastic bridge or brace" with flexing materials; this version is a discrete grid for determinism. Confirm the change.
2. **Genre (medium):** draw-to-solve games are popular; the grid and spring rules differ from free-drawn physics.
3. **Name (medium):** "Draw the Solution" is a common phrase; a rename is likely.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
