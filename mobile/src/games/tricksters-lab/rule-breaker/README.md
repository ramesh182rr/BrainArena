# Rule Breaker (W1-G05): rule discovery

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W1-G05_rule_breaker.md`
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W1-G05_rule_breaker_review.md`

## Rules
- A hidden rule decides which **specimens** pass.
- Specimens vary by shape (circle, triangle, square, hexagon), colour (red, blue, green, yellow, always also written as a word), size (small or large) and marks (1–3): 96 in total.
- **Lab:** tap a tray specimen to scan it. The scanner says **PASS**, or **FAIL plus the property that caused it** (for example "FAIL: colour"), never the value. A pass names no cause, so you must reason across scans.
- **Test:** when ready, sort six new specimens into PASS or FAIL. All correct solves the level.
- **Mistakes:** the batch's true results become extra evidence, and the next test uses a fresh batch. There is no game over.

## Rule forms by band (`rules.ts` → `hiddenRuleKinds`, `ruleSpace`)
| Band | Hidden rule can be | Rules the player must consider | Tray | Min par |
|---|---|---|---|---|
| intro | `prop = value` | 13 | 5 | 2 |
| easy | `=` or `≠` | 26 | 6 | 2 |
| standard | `≠`, marks ≥ / ≤, A AND B | 92 | 8 | 2 |
| advanced | AND, OR | 154 | 9 | 2 |
| expert | OR, A BUT NOT B | 278 | 10 | 3 |

## Generation and validation
1. A seeded RNG picks a rule of a form allowed for the band.
2. The tray is designed, not random:
   - Start with two passing and two failing specimens.
   - Keep adding the specimen that most narrows the remaining candidate rules (chosen among the best three for variety).
   - Add one or two decoys, so the choice of scans affects the score.
3. Test batches are drawn only from specimens whose result the full tray evidence **forces**. Every rule still consistent with the tray agrees on them, so the test is always fair.
4. Par is the smallest set of tray scans that forces the first test. It is computed exactly over every subset with bitmasks, and the tests confirm it by brute force.
5. `validateLevel` re-checks the rule against the band, each test batch's balance and forcing, par and fingerprint.

The four tutorials (one rule form each) and the five curated fallbacks live in `authored.ts` in a compact text format.

## Scoring and hints
- **Score:** 100 for a correct sort. The scan bonus is +50 at par, +30 within 2 extra scans, +15 otherwise. Each hint costs 10 bonus points and each failed test 15. Time is never scored.
- **Hint tier 1:** which properties the rule involves.
- **Hint tier 2:** highlights the most informative untested specimen, or says "you have enough evidence".
- **Hint tier 3:** the rule's form with the values hidden (for example "needs a certain shape AND a certain size").
