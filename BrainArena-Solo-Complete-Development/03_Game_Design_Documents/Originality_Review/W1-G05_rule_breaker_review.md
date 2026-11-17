# Originality Review: W1-G05 Rule Breaker (rule discovery)

- **Game ID/name:** W1-G05, *Rule Breaker*
- **Design owner:** Solo developer (implementation drafted with Claude Code)
- **Review date:** 2026-11-17 (implementation review; human review pending)
- **Implementation reviewed:** `mobile/src/games/tricksters-lab/rule-breaker/` at version 1.0.0

## Broad puzzle principles used
These are general principles of the puzzle genre:
- Inductive rule discovery from labelled examples ("hypothesis testing").
- Choosing informative experiments.
- Demonstrating understanding by classifying new cases.

## Reference products studied (research only)
- None consulted during implementation.
- Rule-induction is a long-standing family of puzzles and tabletop games. This design was written from the catalogue's one-line brief only.

## Distinct player interaction grammar
- **Scan from a fixed tray:** the player chooses which of a limited set of specimens to test. They cannot build their own examples.
- **Asymmetric feedback:** FAIL names the property that caused it (not its value), and PASS names nothing.
- **The proof step is sorting a fresh batch,** not typing or assembling the rule. Mistakes turn into new evidence instead of ending the game.

## Distinct board/state model
- Specimens are drawn from a 96-item space (shape × colour × size × marks).
- Rules come from a defined grammar (`is`, `isNot`, mark thresholds, AND, OR, A-but-not-B), and the space the player must reason over grows with the band.

## Distinct objective and fail/success conditions
- **Objective:** sort all specimens in a test batch correctly.
- **Fairness:** each batch is proven solvable from the tray's evidence.
- **Score:** based on scan efficiency against a computed minimum. There is no fail state.

## Original level generation/content approach
- Hidden rules are sampled per band.
- Trays are designed by greedy information gain plus decoys.
- Exams are drawn only from forced specimens.
- Par is computed exactly; four authored tutorials and five curated fallbacks are included.

## Original story/dialogue/puzzle text confirmation
- All copy, including the rule descriptions, was written for this project.

## Original visual assets and asset licences
- Specimen art (shapes, marks), the scanner panel and cards are SVG and views made for this project.
- Colour is always paired with a written colour word.
- Fonts are recorded (SIL OFL 1.1).
- No third-party assets.

## UI layout not traced/copied
- The layout follows the project's design system.

## Similarity risks found
1. **Genre (medium-low risk):** rule-induction games exist in several forms, including tabletop "hidden rule" games where players build test cases. Rule Breaker differs in four ways:
   - a fixed tray rather than free construction
   - cause-of-failure feedback that names the property but not its value
   - proof by sorting a fresh batch
   - a fixed four-property specimen grammar

   No component shapes, rule cards, terminology or flows were borrowed.
2. **Design change from the catalogue text (note, not a risk):** the catalogue says feedback "reveals which property caused a pass/fail result". During implementation, reporting a cause on PASS made every simple rule solvable in one scan. Causes are now reported **only for failures**. Update the catalogue line or confirm this change.
3. **Inside the catalogue (low risk):** no other game in the catalogue uses classification by hidden rule.
4. **Name (low–medium risk):** "Rule Breaker" is a common phrase and likely used by other products. Run a store and trademark check before release.

## Changes made to reduce similarity
- Chose tray-based scanning and batch sorting instead of free-form construction and verbal rule guessing.

## Human reviewer
_Not yet reviewed._

## Decision
**Pending human review.** Implementation-level assessment: no reproduction of a recognisable game's components or content was found. Confirm the feedback change (risk 2) and run a name check before release.
