# Originality Review: W2-G05 Number Lock (code inference by closeness)

- **Game ID/name:** W2-G05, *Number Lock*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/logic-kingdom/number-lock/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Deducing a hidden code from feedback on trial guesses.
- Narrowing a candidate space.

## Reference products studied (research only)
- Code-breaking games with exact / right-colour-wrong-place peg feedback are a well-known category. The GDD explicitly forbids copying that familiar feedback; no product was consulted.

## Distinct player interaction grammar
- Feedback is **numeric closeness**, not peg matching: each tumbler reports exact (●), one away (◐) or further off (○).
- From the advanced band only the counts are reported, so the player must design tries that isolate tumblers; expert adds an opening sum clue.
- Tries are unlimited; there is no fail state.

## Distinct board/state model
- Code length, digit range, positional or count feedback, optional sum clue, attempts.
- Par comes from a deterministic greedy splitting strategy over the remaining codes.

## Distinct objective and fail/success conditions
- Open the lock. Score: 100, bonus 50 minus 8 per try beyond par + 1 and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded random code (no single-digit codes); par must fall inside the band range; expert sum clues must leave at least 40 candidate codes.
- Tests: at least 100 seeds per band validated (30 for Pallet Ferry's slow advanced/expert bands), determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Tumblers, keys and the ●/◐/○ signals are views and SVG drawn for this project; signals differ by shape, not only colour.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Genre (medium-low):** guess-and-feedback code games are familiar. The closeness signal (±1) and count-only bands are deliberately different from peg feedback; there are no coloured pegs.
2. **Name (medium):** "Number Lock" is generic; run a store check.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
