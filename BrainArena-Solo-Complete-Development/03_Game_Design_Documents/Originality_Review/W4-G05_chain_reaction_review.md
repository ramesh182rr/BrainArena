# Originality Review: W4-G05 Pulsewick (formerly Chain Reaction) (pulse timing)

- **Game ID/name:** W4-G05, *Pulsewick* (formerly *Chain Reaction*)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/pattern-universe/chain-reaction/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Signal propagation over time.
- Synchronisation (two signals meeting).
- Limited rotations.

## Reference products studied (research only)
- Chain-reaction and domino-style toys are a broad genre; no product or level was consulted.

## Distinct player interaction grammar
- Rotate relays and splitters within a rotation budget, then press Fire once; the result plays out tick by tick.
- **Timing is the core:** relays re-fire one tick later, slow relays two; twin locks fire only when two pulses arrive in the same tick.
- There is no tile-path drawing or crossing, which keeps it apart from Volt Courier's routing.

## Distinct board/state model
- Nodes (source, relay, slow relay, splitter, twin lock, star, wall) with orientations; a tick simulator.
- `solveChain` exhaustively finds the minimum taps (par); budget is par + 2.

## Distinct objective and fail/success conditions
- Light every star. Score: 100, bonus 50 minus 5 per rotation over par, 10 per extra fire and 10 per hint.
- No lives, energy or timers on answering; time is never scored.

## Original level generation/content approach
- Seeded boards; twin-lock bands place a constructed symmetric motif so the twin is reachable and must be timed. Three tutorials; fallbacks use a reviewed fixed seed.
- Tests: 200 seeds per band (1,000 total) validated, determinism, fallbacks and tutorials.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hints, feedback and score text were written for this project. There is no story.

## Original visual assets and asset licences
- Nodes and pulse animation are SVG drawn for this project.
- Fonts: Fredoka and Nunito (SIL OFL 1.1), already recorded. No third-party images or sounds.

## UI layout not traced/copied
- The layout follows the project's concept board and design system.

## Similarity risks found
1. **Inside the catalogue (medium, addressed):** the Volt Courier review warned about routing overlap. Chain Reaction uses timing (delays, twin locks), no conduits or crossings.
2. **Name (medium):** "Chain Reaction" is a very common game title; a rename is likely after a store search.

## Follow-up (2026-11-19)
- **Renamed to *Pulsewick*.** The old name, *Chain Reaction*, is a common store title. A web search found no game with the exact new title; the nearest results were unrelated or only loosely similar. This is not a trademark clearance: a formal store and trademark search is still required before release.
- The id `W4-G05` is unchanged, so saved progress is unaffected.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's levels, text, layout or assets was found. Complete the name check before release.
