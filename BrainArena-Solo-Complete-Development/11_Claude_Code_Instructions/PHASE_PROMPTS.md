# Phase-wise Claude Code Prompts

## Phase 0 — Repository audit
Inspect the repo, dependencies, scripts, current tests and architecture. Do not edit. Report gaps against PRD and recommend a minimal plan.

## Phase 1 — Mobile foundation
Create Expo TypeScript shell, navigation, design tokens, error boundaries, SQLite initialization and app settings. Add tests. Keep UI responsive and accessible.

## Phase 2 — Puzzle runtime
Implement game lifecycle, pure game module contract, registry, event model, pause/resume and local persistence. Add a minimal demo game and deterministic tests.

## Phase 3 — First six games
Implement one game at a time using its GDD. For each, create rules/state reducer, tutorial, game UI, scoring, validator, accessibility, offline persistence and tests. Do not copy reference material.

## Phase 4 — Level generation
Build generator interface, deterministic seed/version handling, solver/validator contracts, difficulty estimator, novelty fingerprints, bounded retries and curated fallback. Property-test at least 1,000 seeds per generator where feasible.

## Phase 5 — Remaining games
Implement games in batches. Reuse shared UI primitives, not game-specific rules. Preserve distinct interaction grammars. Run originality review after each game.

## Phase 6 — Daily Arena
Implement per-game performance features, confidence-aware adaptive difficulty and diverse recommendation selection. Add explainability tags and user skip/override.

## Phase 7 — Backend and sync
Implement FastAPI auth adapter, catalogue, event ingestion, idempotency, cursor sync, profile linking and account deletion. Use Neon migrations. Test network failure and duplicate events.

## Phase 8 — Monetisation
Integrate Play Billing and rewarded ads through provider adapters. Validate entitlements and rewarded ad server-side. No forced interstitials. Keep products/config remote.

## Phase 9 — QA and release
Run device matrix, performance, accessibility, privacy, store-policy, backup/restore and release tests. Generate release notes and known-issues list.
