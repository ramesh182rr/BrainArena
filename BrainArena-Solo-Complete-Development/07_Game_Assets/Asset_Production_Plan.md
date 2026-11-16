# Game Asset Production Plan

## Asset taxonomy
- `worlds/<world_id>/environment/`
- `games/<game_id>/sprites/`
- `games/<game_id>/boards/`
- `games/<game_id>/fx/`
- `games/<game_id>/audio/`
- `ui/`
- `characters/`
- `rewards/`

## Naming
`ba_<world>_<game>_<asset-kind>_<name>_v001.ext`

## Production workflow
1. Lock game mechanic and board geometry.
2. Create greybox interaction prototype.
3. List assets by gameplay function.
4. Generate original concept art and select style.
5. Produce clean vectors/sprites.
6. Add animation states and sound cues.
7. Optimise dimensions, compression and texture memory.
8. Test on low-tier Android.
9. Record provenance and approval.

## Animation states
Idle, selected, pressed, valid, invalid, transition, success, failure, disabled. Avoid excessive animation in timed/precision gameplay.
