# Changelog

All notable changes to BrainArena Solo are recorded here. Dates are ISO 8601.

## Unreleased

### M1 — App shell + game runtime (in progress)
- 2026-11-17 — Step 1: created the Expo SDK 58 / React Native 0.88 / TypeScript app in `mobile/`
  with pinned dependency versions, Node 22 pin, strict TypeScript, ESLint, Jest and smoke tests.
  Carried over the blueprint starter files (game contract, registry, SQLite schema).
- 2026-11-17 — Step 2: added the design system (`mobile/src/design-system`): colour, world-accent,
  spacing, radius, typography and motion tokens; WCAG contrast helpers; `AppText`, `Button`, `Card`
  and `Screen` components. Token pairings are contrast-tested; `success` and the Pattern Universe
  text colour were darkened to reach WCAG AA.
- 2026-11-17 — Step 3: added the game runtime (`mobile/src/game-runtime`): extended `GameModule`
  contract (fallback level, fingerprint, hints, score context), lifecycle state machine, seeded PRNG
  and fingerprint hash, domain events, and a pure session model (start, action, pause/resume, hint,
  summary, exit, snapshot/restore). Added the six-world, 30-game catalogue; a game is playable only
  when its module is registered.
- 2026-11-17 — Step 4: added local persistence (`mobile/src/data`): a small SQL port with an
  expo-sqlite adapter, versioned migrations tracked in `PRAGMA user_version`, and profile, session
  and sync-outbox repositories behind a `GameStore` that saves a session and its events in one
  transaction. Replaced the starter `schema.sql` with migration 1, which adds device id, game
  version, level seed, generator version, difficulty, outcome, score and a resumable snapshot.
- 2026-11-17 — Step 5: added Arrow Escape (W3-G01) game logic in
  `mobile/src/games/spatial-dimension/arrow-escape`: energy-current routing rules (conduits,
  crossings, gates, three pulse kinds), pulse simulator, exact minimum-turn solver, seeded
  generator with five difficulty bands, three tutorial boards, one curated fallback per band,
  reducer with undo/reset, scoring and three-tier hints. Not yet registered as playable (step 6).
  Tests: 60 regression seeds per band, a 1,000-seed property run, solver optimality checked
  against brute force, and full play/pause/restore through the session runtime.
- 2026-11-17 — Step 6: added the app shell and the playable Arrow Escape vertical slice.
  Startup opens and migrates SQLite, registers games and loads the guest profile, with a retry
  screen on failure and an error boundary. Five tabs (Home, Explore, Arena, Progress, Profile) and
  a stack for World → Game intro → Play → Results. Arrow Escape is registered as playable with an
  accessible SVG board, tutorials, difficulty choice, undo/reset/hints, pause, and save/resume of
  unfinished levels (also on backgrounding). Arena is a clearly labelled placeholder; Progress
  lists recent local sessions. Added `expo-asset` (required by expo-sqlite at bundle time) and
  `expo-constants`; applied Expo SDK 58 patch updates. `Card` now keeps its accessibility label
  when not pressable.
