# Originality Review: W3-G01 Volt Courier (formerly Arrow Escape), energy-current routing

- **Game ID/name:** W3-G01, *Arrow Escape* (working title; see the naming risk below)
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-17 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/spatial-dimension/arrow-escape/` at rules/generator version 1.0.0

## Broad puzzle principles used
These are general principles of the puzzle genre, which no single game owns:
- Rotating tiles to complete paths across a grid.
- Matching sources to targets by type.
- Limited shared resources: a conduit can carry only one current.
- Graded difficulty from small boards with one rule up to larger boards with several interacting rules.
- Progressive hints and an optional efficiency target ("par").

## Reference products studied (research only)
- **The "arrow puzzle / arrow-exit" genre** (`01_Market_Research/Market_Analysis.md`, section "Arrow Puzzle"). It was used only for the lessons named there: a readable board state, move-order consequences, and clear success/failure feedback.
- **The general tile-rotation path-connection genre.** It was known as background genre knowledge; no specific product was studied or used as a source.
- No levels, screenshots, art, sound or text from any product were consulted during implementation.

## Distinct player interaction grammar
- **One input:** tap a conduit to turn it a quarter turn clockwise. Undo and reset are always available, and nothing is timed.
- **Several pulses at once:** each emitter fires a pulse of a kind (Spark ▲, Wave ● or Flux ◆), and every pulse must reach a receiver of its own kind. The player plans several routes at the same time, not one.
- **Overload rule:** two currents may never share a conduit or a receiver. The routes therefore compete for space, and a route that works alone can block another.
- **Crossings:** fixed tiles where perpendicular currents pass through each other. These are the only shared cells.
- **Gates:** fixed conduits that let only their own pulse kind through and absorb all others.
- **Feedback describes the result:** each pulse reports where it ends up (delivered, stopped, absorbed, off the board, wrong receiver), and overloads are flagged both on the board and in text.

## Distinct board/state model
- The board is a grid of cells (empty, straight, bend, crossing, gate, emitter, receiver) plus one rotation per cell.
- A pure simulator traces each pulse from its emitter. Every conduit pairs its sides one-to-one, so a pulse's path can always be traced back to its emitter and can never loop. Two pulses can therefore only collide in a conduit by entering it from opposite ends, and that is exactly what the overload rule detects.
- Success requires all of the following: every pulse is delivered to a receiver of its kind, every receiver is powered, and nothing is overloaded.
- There is no fail state. Any board can be finished with undo or reset.

## Distinct objective and fail/success conditions
- **Objective:** power every receiver with its matching pulse kind and no overloads.
- **Score:** 100 for solving, plus an efficiency bonus of up to 50 based on turns beyond par (the solver's proven minimum). Each hint lowers only the bonus. Time is never scored, and undo is not penalised.
- **Stars:** 1–3 per level, worked out from the score.

## Original level generation/content approach
- **Generation:** seeded generation keyed by game id, version, seed and difficulty band. It carves a random route per emitter, lets later routes cross earlier straight conduits at right angles (turning those cells into crossings), then adds gates and decoy conduits and scrambles the rotations.
- **Validation:** an exact minimum-turn solver validates every board. A board is rejected if it is already solved, unsolvable, or outside the band's par range.
- **Hand-made boards:** three tutorial boards (one idea each) and one fallback board per band, written in an original text format for this project (`authored.ts`).
- **Tests:** 60 regression seeds per band, a 1,000-seed property run, and solver optimality checked against brute force.

## Original story/dialogue/puzzle text confirmation
- All tutorial copy, hint text, pulse-status sentences and score explanations were written for this project.
- There is no story or dialogue.

## Original visual assets and asset licences
- **Drawn in code:** the board art (tiles, conduits, emitters, receivers, gates, overload markers, current flow) is SVG written for this project. The colours come from the project's own theme and are paired with symbols, so colour is never the only cue.
- **Fonts:** Fredoka and Nunito, both under the SIL Open Font License 1.1. They are recorded in `mobile/ASSETS_AND_LICENSES.md` and `07_Game_Assets/asset_manifest.csv`.
- **Not bundled:** no third-party images, sprites or sounds.

## UI layout not traced/copied
- The play screen layout (header, tutorial card, turns/par pills, framed board, round tool buttons, win dialog) follows the project's own concept board (`06_Visual_Assets`) and design system.
- No competitor screen was used as a reference.

## Similarity risks found
1. **Genre convention (low risk, expected):** tap-to-rotate tiles that connect paths is a long-established, widely used puzzle mechanic. The basic act of rotating conduits is therefore not distinctive on its own. Arrow Escape's distinctness rests on the combination of several typed pulses, the overload rule, crossings, gates and turn-par scoring.
2. **Name (medium risk, action needed):**
   - *Arrow Escape* describes the arrow-exit genre, not this mechanic: there are no arrows to clear and nothing escapes.
   - Store searches for "arrow escape" are likely to surface unrelated existing titles, which risks confusion and a trademark conflict.
   - The catalogue already says names "may be refined after trademark/store search".
3. **Overlap with other games in this catalogue (medium risk, internal):**
   - **W4-G01 Star Thread** ("route a signal through a graph… crossings can alter signal phase") and **W4-G05 Pulsewick** ("pulses travel… redirect at junctions") share the vocabulary of signals, routing and crossings.
   - If those games are built with tile rotation or crossing-as-a-feature, players will feel the catalogue repeating itself (GDD acceptance criterion: "materially different from other games in the catalogue").
4. **Visual treatment (low risk):** neon conduits on a dark board are a common aesthetic for energy and circuit puzzles. The rendering is original, but the look alone is not a differentiator.

## Changes made to reduce similarity
- Introduced the typed-pulse, overload and gate rules, so the puzzle is about allocating shared space between currents, not about completing a single path.
- Kept the board free of arrows, sliding or removal mechanics, so it shares no rules with the arrow-exit genre beyond broad planning.
- Scored against a solver-proven par instead of a timer or move limit.

## Follow-up (2026-11-17)
- **Renamed to *Volt Courier*.** A web search found no game with that exact title. The nearest
  results were unrelated (a space-courier roguelike and a stealth driving game). The other
  candidates were rejected because each sits near an existing routing puzzle:
  - *Current Weaver*: close to "The Weaver", a colour-matched line-routing game.
  - *Pulse Junction*: close to "Pulse Loop", a circuit-connecting puzzle.
  - *Flux Routes*: close to "Flux Grid", a light-routing puzzle.
- **Not a trademark clearance.** A formal trademark and store search is still required before
  release.

## Recommendations before release
- **Rename the game** (done, see the follow-up above): pick a name that matches the mechanic and clears a store and trademark search. Candidates to check: *Current Weaver*, *Pulse Junction*, *Flux Routes*. Changing the display name doesn't touch saved progress, which is keyed by the id `W3-G01`.
- **Keep Star Thread and Pulsewick apart:** when designing W4-G01, use a different input grammar (for example, drawing edges between nodes, with no tile rotation) and avoid crossings as a mechanic. Make sure Pulsewick's timing and delay model, not routing, is its core.
- **Teach gates:** add a dedicated tutorial board, since gates currently appear in the advanced band with only an on-screen note.
- **Playtest comprehension:** run a first-time player test without any external explanation (GDD acceptance criterion; this cannot be verified by automated tests).

## Human reviewer
_Not yet reviewed. To be completed by a human reviewer before production content is approved._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of any recognisable level, story, layout, character or asset was found. The name issue (risk 2) has been addressed by renaming to *Volt Courier*, pending a formal trademark check, and the catalogue overlap (risk 3) must be handled when designing W4-G01 and W4-G05.
