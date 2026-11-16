# QA and Test Strategy

## Test pyramid
- Pure unit tests: reducers, scoring, validators, difficulty functions, recommendation scoring.
- Property tests: generator solvability, deterministic seeds, bounds and invariants.
- Component tests: tutorial, game board, hint, pause/resume, summary.
- Integration tests: SQLite persistence, outbox, sync retry, guest linking.
- E2E tests: onboarding, explore, play, complete, offline restart, reconnect, account link.
- Device tests: low/mid/high Android hardware, different aspect ratios, memory pressure and rotation.

## Required game test cases
- Valid puzzle accepted.
- Invalid/unsolvable puzzle rejected.
- Same seed + same generator version yields same puzzle.
- State reducer is deterministic.
- Invalid action does not corrupt state.
- Completion triggers once.
- Pause/resume preserves state.
- App kill/restart restores unfinished game where supported.
- Hint count/score correct.
- Reduced motion and sound-off work.
- No colour-only information.
- Offline completion persists and syncs once.

## Generator quality
Run seeded batch tests; track generation rejection rate, validator failures, solve-rate distribution, difficulty monotonicity, duplicate fingerprints and mean generation time. Keep regression corpus of seeds.

## Release checklist
- [ ] Crash-free target achieved in beta.
- [ ] Privacy policy and terms published.
- [ ] Account deletion path and web resource implemented.
- [ ] Rewarded ads are opt-in and reward callback verified.
- [ ] Billing entitlement server-verified.
- [ ] Store claims reviewed for medical/scientific language.
- [ ] Asset licences documented.
- [ ] Android 64-bit/build signing verified.
- [ ] Offline sync/recovery tested.
- [ ] Database backup/restore plan tested.
