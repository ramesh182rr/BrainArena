# BrainArena Solo — mobile app

Expo SDK 58 · React Native 0.88 · TypeScript (strict). Android-first, iOS-ready.

Product and design authority lives in `../BrainArena-Solo-Complete-Development/`
(PRD, GDDs, architecture). Read `11_Claude_Code_Instructions/CLAUDE.md` there first.

## Requirements
- Node 22.13+ (pinned in `.node-version`; with fnm run `fnm use`)
- Android SDK + JDK 17 for `npm run android`; Xcode for `npm run ios`

## Commands
| Command | Purpose |
|---|---|
| `npm start` | Start the Metro dev server |
| `npm run android` / `npm run ios` | Build and run a development build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Expo config) |
| `npm test` | Jest unit and component tests |
| `npm run check` | Typecheck + lint + tests; run before every commit |

Add dependencies with `npx expo install <package>` so versions match the SDK.

## Structure
```text
index.ts               # registers the root component
src/
  app/                 # startup, services context, error boundary, navigation
  features/            # screens: home, explore (world map), game (intro/play/results), arena,
                       # progress, profile; common/ holds header, player bar, world emblems
  design-system/       # tokens, contrast helpers, base components
  game-runtime/        # game contract, lifecycle, seeded RNG, events, session model
  games/               # catalogue (30 entries), registry, UI registry, one folder per game
                       # (rules in the module, board UI in its ui/ folder; register in games/index.ts)
  data/sqlite/         # SQL port, expo-sqlite adapter, migrations
  data/repositories/   # profile, session, outbox repositories and GameStore
```
Imports may use the `@/` alias for `src/`. Tests live in `__tests__` folders next to the code.

## Conventions
- Game rules are pure TypeScript with no React or storage imports; UI holds no game logic.
- Generators use `createRng` from `game-runtime/rng.ts`, never `Math.random`; the runtime gets time and ids through injected `RuntimeDeps`.
- A catalogue entry is playable only when its module is registered in `games/registry.ts`.
- Schema changes are new entries in `data/sqlite/migrations.ts`; never edit a shipped migration.
- Repository tests run the real SQL against Node's built-in SQLite (`node:sqlite`), which is why Node 22 is required.
- Visual direction: the concept board in `06_Visual_Assets` (dark cosmic game style) supersedes the
  light palette in `05_UI_UX_Design/Design_System.md`.
- Colours, spacing and type come from `src/design-system/tokens.ts`; do not hard-code them.
- Every animation must respect `useReduceMotion()`; haptics go through `useHaptics()` and are never the
  only feedback.
- List every bundled font, image or sound in `ASSETS_AND_LICENSES.md`.
- Navigation uses React Navigation (native stack + bottom tabs), not Expo Router.
- Never commit secrets, keystores or `.env` files.
