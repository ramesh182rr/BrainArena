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
  app/                 # root component, providers, navigation, startup
  game-runtime/        # game module contract, lifecycle, events
  games/               # registry and one folder per game module
  data/sqlite/         # local schema, migrations, repositories
```
Imports may use the `@/` alias for `src/`. Tests live in `__tests__` folders next to the code.

## Conventions
- Game rules are pure TypeScript with no React or storage imports; UI holds no game logic.
- Navigation uses React Navigation (native stack + bottom tabs), not Expo Router.
- Never commit secrets, keystores or `.env` files.
