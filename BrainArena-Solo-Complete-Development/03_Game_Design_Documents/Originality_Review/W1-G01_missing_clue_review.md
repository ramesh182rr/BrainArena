# Originality Review: W1-G01 The Missing Clue (evidence reconstruction)

- **Game ID/name:** W1-G01, *The Missing Clue*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/tricksters-lab/missing-clue/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Ordering items under before/after and position constraints.
- Deduction toward a single consistent answer.
- Live constraint checking.

## Reference products studied (research only)
- Logic-grid and "order the events" deduction puzzles are a long-established genre; no specific product, case or text was consulted.

## Distinct player interaction grammar
- Drag-free tap grammar: place event tokens on timeline slots, lift them back, with undo and reset.
- Clue cards light up live (satisfied, broken, open), so contradictions show immediately.
- From the advanced band a **witness** arrives mid-story; their "first thing I saw" means first after they arrived, which reframes position clues.

## Distinct board/state model
- Timeline slots plus a pool of event tokens; clue kinds: before, right after, apart, first, last, not first, not last, gap, witness saw.
- A permutation checker (`consistentOrders`) proves every case has exactly one valid order.

## Distinct objective and fail/success conditions
- Fill the timeline so every clue holds. Score: 100, bonus 50 minus 2 per move beyond twice the event count and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded: a random true order is drawn, clues are added until the order is unique, then redundant clues are pruned. Three tutorials; fallbacks use a reviewed fixed seed.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Event tokens and clue cards are design-system views with short text written for this project; no images.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre convention (low):** ordering-by-clues is a common puzzle form; the witness reframing and live clue states are this game's own.
2. **Name (medium):** "missing clue" is a generic phrase likely used by other titles; run a store/trademark search.
3. **Inside the catalogue (low):** W1-G05 Rule Breaker is also deduction, but about hidden rules, not sequences.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
