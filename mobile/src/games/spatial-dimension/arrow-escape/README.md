# Arrow Escape (W3-G01): energy-current routing

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W3-G01_arrow_escape.md`

## Rules
- **Emitters** fire a pulse of one kind: Spark ▲, Wave ● or Flux ◆. Each kind has its own symbol, so colour is never the only cue.
- Pulses travel through **conduits**. A *straight* joins opposite sides and a *bend* joins adjacent sides. Tapping a rotatable conduit turns it 90° clockwise.
- A pulse must end at a **receiver of its own kind**. The board is solved when every pulse is delivered and every receiver is powered.
- **Overload:** two pulses may never share a conduit or a receiver.
- **Crossings** are fixed and let currents on perpendicular axes pass through each other.
- **Gates** are fixed straights that let only their own kind through and absorb every other kind.
- Undo and reset are always available. Undo does not cost score.

## Difficulty bands (`generator.ts` → `PROFILES`)
| Band | Board | Pulses | Kinds | New idea | Turns (par) |
|---|---|---|---|---|---|
| intro | 4×4 | 1 | 1 | turning conduits | 2–8 |
| easy | 5×5 | 2 | 2 | matching kinds, decoy conduits | 3–14 |
| standard | 5×5 | 2–3 | 2 | crossings | 5–20 |
| advanced | 6×6 | 3 | 3 | gates | 7–28 |
| expert | 7×7 | 3–4 | 3 | more gates and decoys | 9–38 |

## Generation and validation
1. A seeded RNG is keyed by game id, version, seed and difficulty.
2. A random route is carved from each emitter. Later routes may cross earlier straights at right angles, which turns those cells into crossings.
3. Gates and decoy conduits are added, and the rotatable conduits are scrambled.
4. The exact solver (`solver.ts`) searches only the conduits pulses actually enter and returns the fewest clockwise turns. The board is rejected if it is already solved, unsolvable, or outside the band's par range. After 60 failed layouts the generator gives up and the runtime serves the band's curated fallback.
5. `validateLevel` re-solves the board independently and checks structure, kind counts, par and fingerprint.

Authored boards (three tutorials and one fallback per band) live in `authored.ts` in a readable text format.

## Scoring
Solving always earns 100 points. A bonus of up to 50 is for finishing near par. Each turn over par costs 5 bonus points and each hint costs 10. Time is never scored.

## Hints
- **Tier 1:** highlights the emitter of a pulse whose route is wrong.
- **Tier 2:** highlights the first misturned conduit on that route.
- **Tier 3:** says how many turns that conduit needs.
