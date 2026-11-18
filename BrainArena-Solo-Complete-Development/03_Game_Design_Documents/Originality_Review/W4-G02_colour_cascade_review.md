# Originality Review: W4-G02 Colour Cascade (colour ecology)

- **Game ID/name:** W4-G02, *Colour Cascade*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/pattern-universe/colour-cascade/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the puzzle genre:
- Spreading or flood mechanics on a grid.
- A cyclic dominance relation (like rock-paper-scissors).
- A limited resource with order-dependent effects.
- A uniform end state as the goal.

## Reference products studied (research only)
- None consulted during implementation.
- Colour-flood puzzles are a known genre and were considered only so that this design would deliberately diverge from them.

## Distinct player interaction grammar
- A **limited, typed inventory** of droplets.
- Drops are allowed **only on marked pads** anywhere in the garden, not from a fixed corner region.
- Spread is governed by a **feeding cycle**: a colour only spreads into the colour it eats, so most drops change only part of the board, and **order is the puzzle**.
- **Hardy shells** absorb one hit, stop the spread and stay safe for the rest of that wave.

## Distinct board/state model
- The board is a grid of plants (colour, shell, pad) and stones, plus a droplet inventory.
- The full state is serialised, and undo history is kept.

## Distinct objective and fail/success conditions
- **Objective:** full bloom.
- **No fail state:** running out of droplets is explained, and undo or reset recovers.
- **Score:** droplets used against a solver-proven par.

## Original level generation/content approach
- Patch-based gardens with randomly placed stones, pads and shells.
- An exact breadth-first par.
- The inventory is taken from one shortest solution, with spares on easier bands.
- Four authored tutorials and five curated fallbacks.

## Original story/dialogue/puzzle text confirmation
- All copy was written for this project.

## Original visual assets and asset licences
- Plant glyphs (flower, burst, leaf, droplet), shells, pads and stones are SVG and views made for this project.
- Colour is always paired with a distinct glyph.
- Fonts are recorded (SIL OFL 1.1).
- No third-party assets.

## UI layout not traced/copied
- The layout follows the project's design system (feeding-cycle legend, garden, droplet tray, round tool buttons).

## Similarity risks found
1. **Colour-flood genre (medium-low risk):** flood-fill colour games usually grow one region from a corner by recolouring it. Colour Cascade has no player-owned region. Each drop is limited and coloured, lands only on pads, and spreads only into its prey colour, with shells. Win conditions match in spirit (one colour) but the decision space differs.
2. **Rule-ambiguity fix (note):** during implementation a cracked shell could be converted later in the same wave, which contradicted "the cascade stops there". The rule now protects a cracked plant for the rest of the wave, and tutorial 3 relies on this.
3. **Inside the catalogue (low risk):**
   - W4-G05 *Pulsewick* also involves spreading effects, but with travel delays and a move budget. Keep its grammar timing-based when it is designed.
   - W4-G04 *Limited Moves* also uses a limited resource. Keep its focus on action costs that change with order, not colour.
4. **Name (low–medium risk):** a descriptive phrase likely used elsewhere. Run a store and trademark check before release.

## Changes made to reduce similarity
- Chose pad-only drops, a typed inventory, a predator cycle and shells, instead of a single player region that absorbs neighbours.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no recognisable level, layout or asset was reproduced. Keep Pulsewick's design distinct, and run a name check.
