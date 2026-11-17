# Originality Review: W6-G04 Switch Challenge (hidden state machine)

- **Game ID/name:** W6-G04, *Switch Challenge*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-18 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/creative-chaos/switch-challenge/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the puzzle genre:
- Discovering a system by experiment.
- Combining linked effects to reach a target configuration.
- Modular (wrap-around) counters.
- Conditional transitions that make order matter.

## Reference products studied (research only)
- None consulted.
- Toggle puzzles where pressing one cell flips its neighbours are a well-known genre. This design deliberately does not use a grid of lights or neighbour-flipping.

## Distinct player interaction grammar
- **Hidden wiring, revealed by pressing:** knowledge is the resource, and it survives Reset while the machine and the budget restart.
- **Machine model, not a grid:** a row of multi-level dials with numbered ticks, and a separate row of lettered switches with arbitrary (not spatial) links that can raise or lower.
- **Locked switches** fire only in a given state, which makes the system a true state machine with order-dependent solutions.

## Distinct board/state model
- The state is dial levels, discovered flags, presses in the current run, the budget and resets.
- An exact breadth-first search over at most `levels^dials` states gives par.

## Distinct objective and fail/success conditions
- **Objective:** match every dial to its target within the budget.
- **No game over:** running out of presses leads to a Reset that keeps your notes.
- **Score:** tolerates two discovery presses beyond par.

## Original level generation/content approach
- Random wiring, constrained so every dial is wired and switches are distinct.
- Random-walk targets, BFS par, and a requirement that locks matter.
- Four tutorials and five curated fallbacks.

## Original story/dialogue/puzzle text confirmation
- All copy was written for this project.

## Original visual assets and asset licences
- Dials, levers, wires and lock badges are SVG and views made for this project.
- Wires carry letter-and-arrow tags in addition to colour.
- Fonts are recorded (SIL OFL 1.1).
- No third-party assets.

## UI layout not traced/copied
- The layout follows the project's design system (dial row, revealed wires, lever row).

## Similarity risks found
1. **Light-toggling puzzles (low risk):** they share the abstract idea of "presses with linked effects", but there is no grid, no neighbour rule, no on/off lights, the wiring is hidden, levels are multi-step, and some switches are locked.
2. **Inside the catalogue (medium-low risk):**
   - W4-G04 *Limited Moves* ("fixed number of actions… order changes later costs") also has a budget and order effects. When designing it, keep it about **costs that change**, not hidden wiring or target dials.
   - W6-G05 *Impossible Machine* is also machine-themed. Keep it about **placing modules** to match an output rhythm.
3. **Name (low–medium risk):** "Switch Challenge" is generic, so a more distinctive title may help discoverability. Run a store and trademark check.

## Changes made to reduce similarity
- Chose hidden, non-spatial wiring, multi-level wrapping dials, lockable switches and knowledge-preserving resets instead of a grid of neighbour-toggled lights.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no recognisable product's layout, components or levels were reproduced. Keep W4-G04 and W6-G05 distinct when designing them, and run a name check.
