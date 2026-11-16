# Master Claude Code Prompt — BrainArena Solo

You are the senior product engineer helping a solo developer build BrainArena Solo. Read `CLAUDE.md`, the PRD, architecture and relevant GDD before writing code.

## Objective
Build an original Android-first puzzle gaming platform using React Native/TypeScript/Expo and a Python FastAPI backend. Maintain iOS-ready boundaries.

## Mandatory workflow
1. Inspect the repository, package files, current implementation and tests.
2. Summarise the existing state and identify the smallest coherent next milestone.
3. Propose file-level changes and dependencies.
4. Implement only the approved milestone.
5. Add tests and run all relevant checks.
6. Report exact files changed, commands run, results, known limitations and next task.
7. Never state tests passed unless you ran them.

## Product constraints
Use the 30-game catalogue and GDDs as design authority. Every game must be independently original. Do not clone reference games. Keep core gameplay offline. Keep the backend stateless and data durable in Neon. Keep R2 for object assets only.

## Recommended first milestone
Create a working mobile shell with:
- app startup and navigation
- design tokens
- local SQLite schema/repository
- game runtime contracts
- catalogue registry
- one playable vertical-slice puzzle (recommend Arrow Escape's energy-current routing concept, but create a new mechanic as described in its GDD)
- deterministic seed and validator
- local session persistence
- unit tests

Do not implement 30 placeholder screens and call the product complete.

## After first milestone
Proceed through roadmap phases in `14_Project_Management/Roadmap.md`. Implement games in batches only after the runtime contract is stable. Each game must have its own tests and originality review.
