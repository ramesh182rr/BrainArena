# Changelog

All notable changes to BrainArena Solo are recorded here. Dates are ISO 8601.

## Unreleased

### M1 summary
Exit gate from `14_Project_Management/Roadmap.md`: "One game vertical slice works offline". **Met.**
Arrow Escape (W3-G01) is playable start to finish with no network, its results are saved in SQLite,
and they survive an app kill and relaunch. Verified on an Android emulator (Pixel 8) as well as in
automated tests.

Master build prompt checklist: app startup and navigation, design tokens, local SQLite schema and
repositories, game runtime contracts, catalogue registry, one playable vertical slice, deterministic
seed and validator, local session persistence, unit tests. All done.

Arrow Escape GDD acceptance criteria:
- Tutorial level teaches the mechanic: 3 tutorial boards.
- At least 50 fixed regression seeds pass the validator: 60 per band (300), plus 1,000 property seeds.
- Success/failure is deterministic.
- Pause/resume does not corrupt the board, including after an app kill.
- Offline result persists locally.
- Not yet verified (needs people): first-time comprehension playtest, and the human originality
  review (`03_Game_Design_Documents/Originality_Review/W3-G01_arrow_escape_review.md`, decision
  pending).

Known limitations carried into M2:
- The name "Arrow Escape" needs replacing before release (see the originality review).
- Gates have no dedicated tutorial board.
- No sound effects or music.
- No mascot art.
- App icon and splash are still Expo template placeholders.
- The Android package id is still `com.anonymous.brainarenasolo`.
- On 320dp-wide screens, expert boards shrink tiles to about 41dp, below the 48dp touch target.
- Daily Arena, sync, accounts and monetisation are later milestones.


### M1: App shell + game runtime (complete, 2026-11-17)
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
- 2026-11-17 — Step 6b: switched the app to a game look and feel, following the concept board in
  `06_Visual_Assets` instead of the plain light palette. Dark "cosmic arcade" theme with starfield,
  Fredoka/Nunito fonts (SIL OFL), glossy press-down buttons, glass panels and an original SVG icon
  set; floating tab bar; player bar with Explorer level and stars; Home hero with a big PLAY button;
  world map of SVG floating-island emblems; training path per game; neon Arrow Escape board with
  animated tile turns and flowing current; win celebration with 1–3 stars; results with count-up.
  Added Motion (system/reduced/full) and Haptics settings, stored in SQLite via migration 2
  (`app_settings`). Stars and Explorer level are derived from best scores (never lost). No lives,
  energy timers or other punitive mechanics. Added reanimated, worklets, linear-gradient, haptics
  and expo-font; fonts recorded in `mobile/ASSETS_AND_LICENSES.md` and the blueprint asset manifest.
- 2026-11-17 — Step 7: added the Arrow Escape originality review (decision pending human review;
  flags the name and the overlap with W4-G01/W4-G05 as risks) and closed M1.
