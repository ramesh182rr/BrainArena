# Originality Review: W2-G03 Sequence Master (rule composition)

- **Game ID/name:** W2-G03, *Sequence Master*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/logic-kingdom/sequence-master/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Number sequences built from repeating operations.
- Fill-the-gap inference.

## Reference products studied (research only)
- Number-sequence questions are a common puzzle and test format; no product or question bank was consulted.

## Distinct player interaction grammar
- Sequences are built from a short repeating **cycle** of steps (+n, −n, ×n), so the player must discover the cycle, not a single rule.
- Blanks can be anywhere, not only at the end; a steps panel lets the player note the cycle.
- Every blank is proven forced: all cycles allowed by the band that fit the visible terms predict the same values.

## Distinct board/state model
- Terms, blank positions, the hidden step cycle and the player's entries.
- `blanksForced` checks every allowed cycle length for consistency.

## Distinct objective and fail/success conditions
- Fill every blank correctly. Score: 100, bonus 50 minus 10 per wrong check and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded cycle and start value per round; blanks are placed and re-checked until forced. Three tutorials; fallbacks use a reviewed fixed seed.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- No images; the board is built from design-system views and text.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Test-style framing (low):** sequence questions resemble aptitude tests. The game avoids "IQ"/clinical framing per the PRD guardrails.
2. **Name (medium):** "Sequence Master" is a generic phrase; run a name check.
3. **Inside the catalogue (low):** W5-G04 Sequence Recall shares the word "sequence" but is memory, not inference. Consider distinct display names to avoid confusion.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
