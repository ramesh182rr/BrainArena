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
