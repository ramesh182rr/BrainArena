# Switch Challenge (W6-G04): hidden state machine

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W6-G04_switch_challenge.md`
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W6-G04_switch_challenge_review.md`

## Rules
- **Dials:** each dial has 3 levels (4 in expert) that wrap round, and a gold **target notch**. Ticks are numbered, so colour is never needed.
- **Switches:** each switch nudges some dials up (▲) or down (▼) by one. Its **wiring is hidden** until its first press, after which the wires are drawn with letter-and-arrow tags.
- **Locked switches** (advanced and up) only fire while a given dial shows a given level, so order matters. A locked press still uses a press and reveals the lock.
- **Press budget:** par + 3. Out of presses is not a failure: **Reset** restores the dials and the budget and **keeps the discovered wiring**.

## Bands (`generator.ts` → `MACHINE_PROFILES`)
| Band | Dials | Levels | Switches | Lowering | Locked | Par |
|---|---|---|---|---|---|---|
| intro | 3 | 3 | 3 | no | 0 | 2–3 |
| easy | 4 | 3 | 3 | yes | 0 | 3–4 |
| standard | 4 | 3 | 4 | yes | 0 | 3–5 |
| advanced | 5 | 3 | 4 | yes | 1 | 4–6 |
| expert | 5 | 4 | 5 | yes | 2 | 5–7 |

## Generation and validation
1. A seeded RNG wires random switches. Every dial must be wired, no two switches may be identical, and locks are placed on dials the switch doesn't move.
2. The target is a random walk of presses from the start, so it is always reachable.
3. A breadth-first search over dial states (`shortestPresses`) gives the exact par. A machine is rejected if par falls outside the band's range, or if no shortest solution needs a locked switch (so locks always matter).
4. `validateLevel` re-checks structure, the start state, reachability within the budget, par and fingerprint.

Four tutorials (discovery, lowering, locks, four levels) and five curated fallbacks are in `authored.ts`.

## Scoring and hints
- **Score:** 100 for reaching the target. The bonus of 50 allows par + 2 presses free for discovery, then costs 5 per extra press, 10 per reset and 10 per hint. Time is never scored.
- **Hint tier 1:** points at a switch whose wiring is still unknown, or says how many presses remain to the target.
- **Hint tier 2:** highlights the next press.
- **Hint tier 3:** highlights the next two presses.
- **If the target is out of reach** with the presses left, the hint suggests Reset.
