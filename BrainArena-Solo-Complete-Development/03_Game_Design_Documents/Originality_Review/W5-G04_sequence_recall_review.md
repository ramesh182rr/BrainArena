# Originality Review: W5-G04 Sequence Recall (multi-channel sequence)

- **Game ID/name:** W5-G04, *Sequence Recall*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/memory-vault/sequence-recall/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the genre:
- Serial recall of a presented sequence.
- Increasing span over rounds.
- Forward and reverse recall.

## Reference products studied (research only)
- None consulted.
- "Repeat the lit sequence" toys and electronic games are a well-known category. This design deliberately avoids their core loop of copying the same lights back.

## Distinct player interaction grammar
- **Cross-channel answers:** items are symbol+place pairs, but each round asks for only one channel, through an input that differs from the display.
  - Seen at places → answered on a symbol keypad, or on blank pads.
  - Later rounds ask for reverse order.
- **Colour-free mapping:** there are no colour-to-button mappings and no tone-to-light mapping.
- **Misses are recoverable:** a miss gives a slot-by-slot comparison and a fresh sequence. There are no lives and no game over.

## Distinct board/state model
- Each round attempt's sequence is derived from (seed, round, attempt).
- The state machine runs ready → showing → answer → feedback.
- An interrupted show restarts.

## Distinct objective and fail/success conditions
- **Objective:** recall every round.
- **Score:** misses and hints reduce only the bonus. Answer time is never scored.

## Original level generation/content approach
- Band profiles control grid size, palette, round lengths, channels and pacing.
- Consecutive items never repeat a place or a symbol.
- Three authored tutorials teach one channel idea each.
- Fallbacks use reviewed fixed seeds.

## Original story/dialogue/puzzle text confirmation
- All copy was written for this project.

## Original visual assets and asset licences
- The symbol set (star, moon, gem, bolt, ring, wave) is drawn in SVG for this project, and each symbol has its own silhouette.
- Pads and slots are views.
- Fonts are recorded (SIL OFL 1.1).
- No sound yet.

## UI layout not traced/copied
- The layout follows the project's design system.

## Similarity risks found
1. **"Repeat the lights" toys and games (medium-low risk):** the familiar loop shows coloured lights and tones, and the player repeats them on the same buttons. Sequence Recall avoids that loop:
   - no coloured quadrant buttons or tones
   - answers go through a different channel, often reversed
   - no game-over-on-mistake structure
2. **Catalogue gap (note):** the catalogue lists "tones" as one of the channels. Tones are deferred until audio exists. When added, they should be another *channel to translate*, not a light-and-tone pairing.
3. **Inside the catalogue (low risk):** W5-G03 *What's Changed?* also involves ordered recall (the order of changes). Keep it about spotting scene differences, not item sequences.
4. **Name (low–medium risk):** a descriptive phrase likely used elsewhere. Run a name check.

## Changes made to reduce similarity
- Translated channels, reverse rounds and fresh sequences after a miss, in place of copy-the-lights with game over.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable product's components or presentation was found. Decide how tones will fit before adding audio.
