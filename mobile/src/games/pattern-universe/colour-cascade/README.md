# Colour Cascade (W4-G02): colour ecology

GDD: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/GDDs/W4-G02_colour_cascade.md`
Originality review: `BrainArena-Solo-Complete-Development/03_Game_Design_Documents/Originality_Review/W4-G02_colour_cascade_review.md`

## Rules
- **Plants:** each plant has a colour from the garden's **feeding cycle**, and each colour eats the next one along. With three colours, Rose eats Leaf, Leaf eats Sky and Sky eats Rose. Expert gardens add Sun to make four. Every colour has its own glyph (flower, burst, leaf, droplet).
- **Drops:** pick a droplet from your limited inventory and tap a **watering pad** (dashed gold ring). That plant takes the droplet's colour.
- **Cascade:** from every plant that changed, the colour spreads to connected plants of the colour it eats.
- **Hardy plants** (white shell) crack instead of changing and stop the spread. A cracked plant stays safe for the rest of that wave, and the next hit changes it.
- **Stones** block the spread.
- **Goal:** **full bloom**, meaning every plant shares one colour. Undo and reset are free.

## Difficulty bands (`generator.ts` → `GARDEN_PROFILES`)
| Band | Garden | Colours | Pads | Stones | Hardy | Par | Spare droplets |
|---|---|---|---|---|---|---|---|
| intro | 4×4 | 3 | 3 | 0 | 0 | 2 | 1 |
| easy | 4×5 | 3 | 3 | 0 | 0 | 2–3 | 1 |
| standard | 5×5 | 3 | 4 | 2 | 0 | 3 | 0 |
| advanced | 5×5 | 3 | 4 | 2 | 2 | 3–4 | 0 |
| expert | 5×6 | 4 | 4 | 2 | 2 | 3–4 | 0 |

## Generation and validation
1. A seeded RNG builds colour **patches**: random seeds, with each cell taking the nearest seed's colour. It then places stones, pads and hardy plants.
2. A breadth-first solver (`solver.ts`) finds the fewest drops with any colours. Gardens outside the band's par range are rejected.
3. The inventory is the droplets of that shortest solution, plus any spares for the band. The solver re-checks the garden with that exact inventory to set par.
4. `validateLevel` re-solves the garden and checks its size, the cycle, the pads, that it isn't already in bloom, par and fingerprint. Tests cross-check the solver against an independent depth-first search.

The four tutorials (cascade, order, shells, four colours) and the five curated fallbacks are in `authored.ts`.

## Scoring and hints
- **Score:** 100 for full bloom, plus +50 at par or +30 above par. Each hint costs 10 bonus points. Time is never scored.
- **Hint tier 1:** names the colour to aim for.
- **Hint tier 2:** highlights the next pad.
- **Hint tier 3:** names the droplet colour for that pad.
- **If the garden can't bloom** with the droplets left, the hint says so and suggests Undo.
