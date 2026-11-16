# Product Requirements Document — BrainArena Solo

**Version:** 1.0 | **Status:** Approved baseline for implementation | **Audience:** Adults 18+

## 1. Product vision
Create a colourful, original puzzle gaming universe where adults can freely explore different puzzle experiences or follow a short personalised daily challenge. The system learns from gameplay to recommend variety and tune difficulty without making clinical claims.

## 2. Goals
- Deliver 30 original game concepts across six discoverable worlds.
- Make the first session understandable and rewarding.
- Support free exploration and optional Daily Arena.
- Support offline play and resilient sync.
- Provide fair, explainable difficulty adaptation.
- Establish a sustainable freemium foundation.
- Build Android-first with a clean iOS migration path.

## 3. Non-goals
- Clinical assessment, treatment or diagnosis.
- Claims about IQ, dementia prevention or guaranteed real-world cognitive transfer.
- Multiplayer/social network at launch.
- Mandatory AI/LLM runtime.
- Recreating competitors' levels, characters, UI or distinctive gameplay.
- Requiring internet for core gameplay.

## 4. Users and jobs-to-be-done
- Casual Explorer: "When I have a few minutes, help me find a fun puzzle without forcing a programme."
- Puzzle Solver: "Give me fresh, fair challenges that become more interesting as I improve."
- Daily Player: "Build a short session from games I enjoy and games I have not mastered."
- Offline Player: "Let me keep playing and save my progress when I have no connection."

## 5. Information architecture
Primary navigation:
1. Home — continue, Daily Arena, featured world, recent games.
2. Explore — six worlds, game catalogue, filters and unlock state.
3. Arena — daily session, weekly missions, special challenges.
4. Progress — play history, game mastery, category trends, achievements.
5. Profile — guest/account state, preferences, subscription, privacy, support.

## 6. Functional requirements

### Onboarding and identity
- FR-001: User can enter as guest without registration.
- FR-002: User can select session preference (short/medium/long) and puzzle interests.
- FR-003: User completes a short optional baseline sampler; it is not described as a clinical test.
- FR-004: Progressive profiling updates recommendations as actual play history grows.
- FR-005: Guest data persists locally and can be migrated to an account.
- FR-006: Account creation supports email/OAuth provider strategy; final provider choice is implementation-configurable.
- FR-007: Account deletion can be initiated in-app and via a public web page if accounts are created.

### Puzzle catalogue
- FR-010: Catalogue contains six worlds and 30 original game entries.
- FR-011: Each game has metadata: mechanics, tags, orientation, offline capability, generator type, difficulty model, asset pack and version.
- FR-012: Each game is independently launchable/testable.
- FR-013: Players can resume supported games and levels.
- FR-014: Instructions and accessibility hints are available before first play.
- FR-015: Games expose a common lifecycle: load, ready, play, pause, success, fail, summary, exit.

### Level system
- FR-020: Support authored, procedural and hybrid levels.
- FR-021: Procedural levels are deterministic from game ID, generator version and seed.
- FR-022: Every generated puzzle passes game-specific validity checks before presentation.
- FR-023: Generators provide solution traces or a validator result for QA.
- FR-024: Difficulty is calibrated by structural complexity and tested solve rate, not only timers or board size.
- FR-025: The client can cache downloaded level packs and generated level metadata.
- FR-026: If generation fails, serve a curated fallback level.
- FR-027: Prevent near-duplicate recent levels using fingerprints/novelty checks.

### Daily Arena and personalisation
- FR-030: Daily Arena recommends 3–5 games, configurable to session preference.
- FR-031: Recommendations use player preference, recency, game-specific performance, variety and availability.
- FR-032: User can skip recommendations and freely explore.
- FR-033: Difficulty changes are bounded and explainable.
- FR-034: Confidence is tracked; sparse data does not trigger strong conclusions.
- FR-035: Cross-game category signals are descriptive in-app performance trends only.
- FR-036: Daily selection can be cached for offline play.

### Progress and rewards
- FR-040: Store attempts, completions, hints, score, duration where relevant, level seed and game version.
- FR-041: Show per-game personal best and recent trend.
- FR-042: Provide achievements and non-punitive streaks.
- FR-043: Rewards must not encourage compulsive play or penalise healthy breaks.
- FR-044: User can review and delete account-associated data subject to legal retention disclosures.

### Offline and sync
- FR-050: Core game play works offline after app/content installation.
- FR-051: Local events are appended to an outbox with stable UUIDs.
- FR-052: Sync is idempotent and retryable.
- FR-053: Sync conflicts use explicit merge policies; no silent loss of completed levels.
- FR-054: Guest-to-account migration preserves progress and avoids duplicate events.
- FR-055: API unavailability never blocks local gameplay.

### Monetisation
- FR-060: Free tier includes meaningful play across all six worlds.
- FR-061: Premium features are remotely configurable and server-entitled.
- FR-062: Rewarded ads are optional and user-initiated only.
- FR-063: No interstitial/banner ads at launch.
- FR-064: Ads never block a puzzle's basic completion.
- FR-065: Premium users receive an ad-free experience.
- FR-066: Subscription pricing and product IDs are configuration-driven, not hard-coded.

### Safety, privacy and accessibility
- FR-070: Store listing and in-app copy use recreational puzzle/mental fitness language.
- FR-071: No medical diagnosis or treatment claims.
- FR-072: Collect only data needed for gameplay, sync and product analytics.
- FR-073: Provide privacy policy, terms, consent and deletion flows.
- FR-074: Use accessible contrast, scalable text, reduced-motion options and non-colour-only cues.
- FR-075: Sound can be muted; haptics can be disabled.
- FR-076: Support English first with externalised strings and locale-aware formatting.

## 7. Non-functional requirements
- NFR-001: Core input-to-feedback should feel immediate; target <100 ms for local interactions on target devices where feasible.
- NFR-002: Avoid network dependency in gameplay loops.
- NFR-003: Support a practical Android device range; define minimum OS after dependency validation.
- NFR-004: App launch and memory budgets measured on low/mid-tier test devices.
- NFR-005: Crash-free sessions target >=99.5% before broad release.
- NFR-006: All APIs use TLS; secrets stored only in server environment variables.
- NFR-007: Passwords are never stored in plaintext; use a proven auth provider/library.
- NFR-008: Database migrations are versioned and reversible where safe.
- NFR-009: Every game has unit tests for state transitions and scoring.
- NFR-010: Procedural generators have property tests and fixed regression seeds.

## 8. MVP and launch scope
Confirmed launch target: 30 game concepts across six worlds. This is a content target, not permission to ship unfinished games. Release gate requires all 30 to meet minimum quality criteria. Internally implement in batches:
- Vertical slice: 1 game + common runtime.
- Batch A: 6 games.
- Batch B: 9 games.
- Batch C: 15 games.
- Daily Arena, progression and sync integrated progressively.

## 9. Acceptance criteria
- Guest can install, start and play a game without account or network.
- A completed session survives app restart.
- Daily Arena can create a deterministic, explainable recommendation set from available data.
- Generated level has valid solution/validator result before display.
- User can skip, exit or explore at any time.
- Offline event sync does not duplicate results.
- Rewarded ad requires explicit tap and can be declined.
- Account deletion and privacy links exist before account creation is enabled publicly.
- No screen labels performance as clinical cognitive ability.

## 10. Release gates
- Game design originality review passed.
- Game tutorial comprehension tested.
- Level generator property tests passed.
- Offline/reconnect tests passed.
- Accessibility and reduced-motion checks passed.
- Billing and ads policy review passed.
- Privacy and account deletion flows tested.
- Android performance tested on low/mid/high tier.
- Store listing claims reviewed for scientific and policy accuracy.

## 11. Open implementation decisions
These are intentionally configuration/engineering choices, not blockers to the product:
- Auth provider (managed auth vs own integration).
- Analytics vendor and event retention.
- Billing SDK implementation and server verification details.
- Ad network and consent provider.
- Minimum Android API and iOS deployment target.
- Exact subscription price and trial terms.
