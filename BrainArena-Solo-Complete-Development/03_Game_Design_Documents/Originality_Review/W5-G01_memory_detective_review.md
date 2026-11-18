# Originality Review: W5-G01 Memory Detective (scene reconstruction by relationships)

- **Game ID/name:** W5-G01, *Memory Detective*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/memory-vault/memory-detective/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Visual memory of object arrangements.
- Relative (not absolute) spatial recall.

## Reference products studied (research only)
- Memory games that ask players to restore a scene are generic; no product was consulted.

## Distinct player interaction grammar
- The scene is shown whole, briefly; the rebuild map is larger, and only pairwise left/right and above/below relations are scored.
- Translating the whole arrangement is fine, unlike Snapshot Memory, which scores exact squares from partial views.
- A miss lists the wrong pairs in words, then gives a fresh room.

## Distinct board/state model
- Scene items per (seed, round, attempt), placements, pair results.

## Distinct objective and fail/success conditions
- Rebuild every room. Score: 100, bonus up to 50 from pair accuracy, minus 15 per miss and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded scenes that avoid all objects in one row or column; pass mark 75% of pairs.
- Tests: at least 120 seeds per band validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Everyday object icons (cup, lamp, book, plant, clock, ball, key, hat) are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (addressed):** distinct from Snapshot Memory (relations vs exact squares) and What's Changed? (no difference spotting).
2. **Name (medium):** "Memory Detective" may exist on stores; run a check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
