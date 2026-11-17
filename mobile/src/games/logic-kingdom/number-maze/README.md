# Number Maze (W2-G02): arithmetic route planning

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W2-G02_number_maze.md`
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W2-G02_number_maze_review.md`

## Rules
- You start on START holding a number. Tap an orthogonally adjacent room to step into it. You cannot revisit a room.
- **Gate rooms** apply `+n`, `−n`, `×n` or `÷n` to your number. Division must be exact.
- Your number must stay within the level's **range** (min–max) after every step.
- **Locks** keep your number. EVEN only opens on an even number, ODD on an odd one.
- The **EXIT** opens only when you hold exactly the **target**.
- Refused taps explain why (for example, "That would rise to 25, above the maximum of 20"). Undo and reset are free.

## Difficulty bands (`generator.ts` → `MAZE_PROFILES`)
| Band | Grid | New idea | Range | Sealed rooms | Locks | Min par | Max routes |
|---|---|---|---|---|---|---|---|
| intro | 3×3 | + and − | 0–20 | 0 | 0 | 3 | 4 |
| easy | 4×4 | × | 0–40 | 1 | 0 | 4 | 6 |
| standard | 4×5 | ÷ (exact) | 0–50 | 2 | 0 | 5 | 5 |
| advanced | 5×5 | parity locks | 0–40 | 2 | 2 | 6 | 4 |
| expert | 5×6 | tighter range, more walls | 0–30 | 3 | 3 | 8 | 3 |

## Generation and validation
1. A seeded RNG is keyed by game id, version, seed and band.
2. A random self-avoiding route is planted from a random START. Each room on it gets a gate that keeps the number inside the range and changes it. Locks are placed on route rooms to match the number's parity at that point. The final value becomes the target.
3. Off-route rooms become sealed blocks or decoy gates.
4. The exact solver (`solver.ts`) enumerates every simple route. A board is rejected if it is unsolvable, shorter than the band's minimum par, or has more distinct routes than allowed (too loose). After 120 failed attempts, the curated fallback is served.
5. `validateLevel` re-solves the board and checks structure, bounds, par and fingerprint. Tests cross-check the solver against an independent breadth-first search.

The four tutorials (one idea each, each with a single solution) and the five curated fallbacks live in `authored.ts`.

## Scoring and hints
- **Score:** 100 for reaching the exit. The route bonus is +50 for the shortest route, +30 within 2 extra moves, +15 otherwise. Each hint costs 10 bonus points. Time and undo are never scored.
- **Hint tier 1:** says whether the exit is still reachable and in how many moves.
- **Hint tier 2:** highlights the next room.
- **Hint tier 3:** highlights the next three rooms.
- **On a dead-end route,** any hint highlights the last room you can undo back to that still works.
