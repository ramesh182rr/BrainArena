# Originality Review: W1-G03 Hidden Truth (perspective switching)

- **Game ID/name:** W1-G03, *Hidden Truth*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/tricksters-lab/hidden-truth/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Viewpoint-dependent vs viewpoint-independent spatial relations.
- Elimination by testing.

## Reference products studied (research only)
- Perspective-taking puzzles are generic; no product was consulted.

## Distinct player interaction grammar
- Walk round a small table (two or four sides) and see it in simple perspective from each.
- Statements mix viewer-relative relations (left of, in front of) with relations that never change (next to, corner to corner, in a line, exactly between, on a corner).
- Cross out what you disprove; pick the one statement true from every side.

## Distinct board/state model
- Object cells in table coordinates; statements; `viewRC` maps cells to each viewpoint.
- Validation proves exactly one statement is true from every allowed side.

## Distinct objective and fail/success conditions
- Pick the always-true statement. Score: 100, bonus 50 minus 20 per wrong pick and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded tables; the answer is a true invariant statement; half the decoys are tempting (true from the starting side).
- Tests: at least 60 seeds per band validated (most bands 150–200), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Reuses the project's object icons; the table is drawn in SVG.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Learnable shortcut (note):** players may learn that relative statements are never the answer. Later versions could add compound statements to keep it fresh.
2. **Name (low-medium):** run a name check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
