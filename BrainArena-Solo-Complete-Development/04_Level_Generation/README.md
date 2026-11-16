# Level Generation Framework

## Strategy
Use one generator contract across games, but independent game-specific generators. Generator output must include a deterministic seed, version, state, intended solution or validation certificate, difficulty features and fingerprint.

## Generation classes
- Authored: story, lateral-thinking, visual scene and creative puzzles where ambiguity is dangerous.
- Procedural: mathematical/constraint/graph/state-space games where a validator can prove solvability.
- Hybrid: curated templates populated with generated parameters and then validated.

## Quality pipeline
1. Generate candidate.
2. Validate hard constraints.
3. Solve with reference solver or independent validator.
4. Estimate difficulty from features and solver effort.
5. Compare fingerprint with recent history.
6. Run fairness/ambiguity checks.
7. Accept or reject; cap retries and use curated fallback.

## Included example
`examples/number_maze_generator.py` demonstrates a deterministic graph path with arithmetic gates and a validator. It is an educational starter, not the final generator for every game.
