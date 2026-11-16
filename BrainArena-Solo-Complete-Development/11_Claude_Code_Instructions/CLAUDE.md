# CLAUDE.md — BrainArena Solo

## Product constraints
- Product: BrainArena Solo, Android-first puzzle gaming platform for adults 18+.
- Six worlds, 30 original game concepts.
- React Native + TypeScript + Expo development builds; Python + FastAPI; Neon; Render; Cloudflare R2; SQLite.
- Offline-first gameplay. API is not required to play.
- Free exploration + Daily Arena + optional special challenges.
- Rewarded ads only and explicit opt-in.
- No mandatory paid AI API.
- Primary art: original colourful 2D; selected 3D.
- English first, localisation-ready.
- Portrait-first; landscape only where justified.

## Non-negotiable originality rules
- Never reproduce competitor levels, stories, board layouts, characters, UI, art, sound, branding or distinctive sequences.
- Use reference products only to understand broad puzzle principles.
- Every game needs a distinct interaction grammar and original content.
- Run and document an originality review before marking a game production-ready.
- Use only original, properly licensed or user-provided assets.

## Engineering rules
- Inspect repository and existing conventions before editing.
- Do not overwrite working code without explaining why.
- Keep game rules pure and testable; UI must not contain game logic.
- Each game is an independent module registered through the common game contract.
- Use deterministic seeds and generator versions.
- Validate generated puzzles before display.
- Store gameplay locally first; sync events idempotently.
- Never place secrets in source control.
- Use migrations for schema changes.
- Run typecheck, lint and relevant tests after each task.
- Update docs and changelog with meaningful changes.
- Avoid introducing microservices without measured need.
- Do not claim a feature is complete unless it is implemented and tested.

## Definition of done
A task is done only when implementation, tests, error states, accessibility, offline behavior where applicable, docs and acceptance criteria are checked. For game modules, include fixed seeds and generator tests.
