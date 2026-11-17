# Sequence Recall (W5-G04): multi-channel sequence

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W5-G04_sequence_recall.md`
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W5-G04_sequence_recall_review.md`

## Rules
- **Watch:** press Watch and items light up one at a time. Each item is a **symbol at a place** on a 2×2 or 3×3 grid. Every item is also captioned in words (for example "Moon, bottom right") for screen readers.
- **Answer through a channel:** each round names one channel. The answer input never mirrors the display, so the memory has to be translated:
  - **places** in order, on blank pads
  - **symbols** in order, on a symbol keypad
  - places in **reverse**
  - symbols in **reverse**
- **No answer timer.** "Remove last" fixes a tap.
- **Misses:** a missed round shows a slot-by-slot comparison and gives a **fresh sequence** of the same length. There is no game over.
- **Pausing** stops the show. The show restarts from its first item on resume, and also after an app restore.

## Bands (`generator.ts` → `RECALL_PROFILES`)
| Band | Grid | Symbols | Rounds (length · channel) | ms per item |
|---|---|---|---|---|
| intro | 2×2 | 3 | 3 places · 3 symbols · 4 places | 1000 |
| easy | 2×2 | 4 | 4 symbols · 4 places · 5 symbols | 900 |
| standard | 3×3 | 4 | 4 places · 5 symbols · 5 reverse places | 850 |
| advanced | 3×3 | 5 | 5 symbols · 5 reverse places · 6 places | 800 |
| expert | 3×3 | 6 | 6 reverse places · 6 symbols · 7 reverse symbols | 750 |

## Determinism
Each round attempt's sequence comes from `sequenceFor(seed, round, attempt)` (seeded RNG). A restored session therefore shows exactly the same items. Consecutive items never share a place or a symbol. `validateLevel` checks the grid, palette, rounds, timing, the start state, every round's first sequence and the fingerprint.

## Scoring and hints
- **Score:** 100 for recalling every round. The bonus of 50 drops by 15 per missed round and 10 per hint. Answer time is never scored.
- **Hints** work during the answer phase:
  - **Tier 1:** highlights the first key.
  - **Tier 2:** highlights the next key.
  - **Tier 3:** highlights the next two keys.

## Not yet included
The catalogue mentions **tones**. There is no audio library or sound assets yet, so the tone channel is deferred until sound effects are added.
