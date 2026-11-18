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
- The name "Arrow Escape" needed replacing (see the originality review); renamed to Volt Courier
  at the start of M2.
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

### M3: 15 games (complete, 2026-11-18)
Nine games were added, bringing the catalogue to 15 playable games, with at least two per world.
Each new game has seeded generation and validation over five bands (200 seeds per band in tests),
tutorials, a curated fallback per band, three-tier hints, stars, save and resume, accessibility
labels, a README and an originality review (pending human sign-off).

| World | Game | Core idea |
|---|---|---|
| Trickster's Lab | The Missing Clue (W1-G01) | Order events from clue cards; a mid-story witness reframes "first" |
| Logic Kingdom | Meow Grid (W2-G01) | Cat Latin square with irregular regions and echo pairs |
| Logic Kingdom | Sequence Master (W2-G03) | Fill blanks in sequences built from repeating step cycles; every blank proven forced |
| Spatial Dimension | Shape Shift (W3-G04) | Turn, tilt and roll a cube shape until its shadows match |
| Spatial Dimension | Mirror World (W3-G05) | One arrow moves two explorers; the second gets a transformed move |
| Pattern Universe | Chain Reaction (W4-G05) | Pulse timing: relays, slow relays, splitters and twin locks |
| Memory Vault | What's Changed? (W5-G03) | Study a scene, then mark every changed square |
| Memory Vault | Snapshot Memory (W5-G05) | A camera window sweeps a room; rebuild its map |
| Creative Chaos | Gravity Lab (W6-G01) | Place attractors and repulsors; launch the orb through gates to the exit |

Design notes to confirm:
- Chain Reaction is about timing, not routing (Volt Courier overlap addressed).
- What's Changed? has no ordering step (Sequence Recall overlap addressed).
- Gravity Lab uses discrete corner-swing physics instead of continuous gravity, for determinism.

Carried forward: human originality reviews, name and trademark checks (Shape Shift, Mirror World and
Chain Reaction are common titles), comprehension playtests, a colour-free option for recolour changes
in What's Changed?, audio, app icon and splash, and the package id.

- 2026-11-18 — Release APK built for real-device testing (signed with the debug keystore; not for
  store upload).

### M2: First 6 games (complete, 2026-11-18)
Exit gate from `14_Project_Management/Roadmap.md`: "Each has tutorial, scoring, tests and
originality review". **Met** for all six games, with each originality review pending human
sign-off. Every world now has one playable game:

| World | Game | Notes |
|---|---|---|
| Trickster's Lab | Rule Breaker (W1-G05) | Feedback names the cause on FAIL only (confirm the catalogue change) |
| Logic Kingdom | Number Maze (W2-G02) | |
| Spatial Dimension | Volt Courier (W3-G01) | Renamed from Arrow Escape |
| Pattern Universe | Colour Cascade (W4-G02) | |
| Memory Vault | Sequence Recall (W5-G04) | Tones deferred until audio exists |
| Creative Chaos | Switch Challenge (W6-G04) | |

All six games share these properties:
- Seeded, validated generation over five bands.
- Tutorials that teach one idea each.
- Curated fallbacks.
- Three-tier hints.
- Stars.
- Save and resume.
- Accessibility labels.
- A 1,000-seed property test.

Every game was played on an Android emulator.

Carried forward:
- Human originality reviews and name and trademark checks.
- Comprehension playtests with real players.
- Audio.
- App icon and splash.
- Package id.
- A gate tutorial for Volt Courier.
- The design reminders for later games: W4-G01 and W4-G05 must stay distinct from Volt Courier, W4-G04 and W6-G05 from Switch Challenge, and W5-G03 from Sequence Recall.

- 2026-11-17 — Renamed W3-G01 *Arrow Escape* to **Volt Courier** in the app, code (module folder
  `volt-courier`), catalogue, GDD and originality review. The id `W3-G01` is unchanged, so saved
  progress is unaffected. A formal trademark check is still pending.
- 2026-11-17 — Added **Number Maze** (W2-G02, Logic Kingdom), the second playable game. Grid routes
  through +, −, ×, ÷ gates with a value range, exact division and EVEN/ODD locks; the exit opens only
  at the target. Exact route solver (cross-checked with breadth-first search), seeded generator over
  five bands (one new idea each), 4 tutorials including locks, 5 curated fallbacks, refusal
  explanations, route-length scoring, three-tier hints with dead-end rescue. Tests: 60 regression
  seeds per band, 1,000 property seeds, rules, solver, UI view and board. Originality review added
  (pending human sign-off).
- 2026-11-17 — Home now features the unfinished game, else the last played one. The win dialog
  message is per game (`GameUi.successMessage`). Training-path nodes size to fit any number of
  tutorials.
- 2026-11-17 — Added **Rule Breaker** (W1-G05, Trickster's Lab), the third playable game. Scan
  tray specimens against a hidden rule (PASS, or FAIL with the causing property), then prove it by
  sorting six fresh specimens; mistakes become evidence. Rule grammar grows per band (is / is-not /
  mark counts / AND / OR / but-not; 13 to 278 candidate rules). Trays designed by information
  gain plus decoys; tests drawn only from specimens the tray evidence forces; exact par by subset
  search (brute-force confirmed). 4 tutorials, 5 curated fallbacks, three-tier hints. Design change
  from the catalogue: a PASS reports no cause (it made simple rules one-scan trivial), recorded in
  the originality review.
- 2026-11-18 — Added **Colour Cascade** (W4-G02, Pattern Universe), the fourth playable game.
  Drop limited coloured droplets on watering pads; the colour cascades through connected plants
  it eats along a feeding cycle (3 colours, 4 in expert); shells absorb one hit and stop the
  wave; stones block; goal is full bloom (one colour). Patch-based seeded gardens, exact
  breadth-first par (brute-force cross-checked), inventory from a shortest solution, 4 tutorials,
  5 curated fallbacks, cascade pop animation, droplet tray, out-of-droplets guidance, three-tier
  hints.
- 2026-11-18 — Added **Sequence Recall** (W5-G04, Memory Vault), the fifth playable game. Watch
  symbols light up at places, then answer through the round's channel (places, symbols, or either
  in reverse) on an input that differs from the display. Deterministic per (seed, round, attempt);
  no consecutive repeats; timed show that stops when paused and restarts on resume or restore;
  words caption every item for screen readers; slot-by-slot miss feedback with a fresh sequence;
  3 tutorials; hints highlight the next keys. Tones are deferred until audio exists.
- 2026-11-18 — Tab bar highlight keeps its rounded corners on Android (constant transparent
  background and border).
- 2026-11-18 — Added **Switch Challenge** (W6-G04, Creative Chaos), the sixth playable game, which
  completes M2. Dials with wrap-around levels, switches with hidden wiring revealed on first press,
  and locked switches that fire only in a given dial state. Press budget is par + 3; Reset keeps the
  discovered wiring. Exact BFS par, random-walk targets, locks guaranteed to matter, 4 tutorials,
  5 fallbacks, hints. The results subtitle no longer clips on Android.
