# React Native Mobile Starter

Recommended stack:
- Expo development builds + React Native + TypeScript
- React Navigation
- Zustand for local UI state
- TanStack Query for remote cache
- SQLite for durable offline data
- Reanimated and Gesture Handler
- Skia only for games that need custom canvas rendering

Start with a vertical slice. Keep game logic pure TypeScript and independent of React components.

Suggested app structure:
```text
src/
  app/                 # providers, navigation, startup
  features/
    home/
    explore/
    arena/
    progress/
    profile/
  game-runtime/        # lifecycle, event bus, shared UI contracts
  games/
    registry.ts
    tricksters-lab/
    logic-kingdom/
    spatial-dimension/
    pattern-universe/
    memory-vault/
    creative-chaos/
  data/
    sqlite/
    repositories/
    sync/
  domain/
    events/
    recommendations/
    progression/
  design-system/
  platform/
```
