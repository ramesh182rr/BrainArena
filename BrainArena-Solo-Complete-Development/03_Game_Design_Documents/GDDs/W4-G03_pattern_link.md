# Game Design Document — Pattern Link

**ID:** W4-G03  
**World:** Pattern Universe  
**Status:** Original concept — design validation required  
**Primary signal:** Pattern recognition

## 1. Player promise
Solve a self-contained, fair puzzle by understanding and manipulating a small set of rules. The game should feel surprising but never arbitrary.

## 2. Core mechanic
**Motif weaving**

Trace a path through motif tiles; each tile changes the allowed next motif, creating a chain grammar the player must infer.

## 3. Core loop
1. Present a compact objective and readable puzzle state.
2. Teach one interaction through a safe first level.
3. Let the player inspect, manipulate and test the puzzle.
4. Give immediate, specific feedback for invalid or productive actions.
5. Resolve success with a satisfying animation and a concise explanation.
6. Offer a next level, replay or exit without pressure.

## 4. Controls
- Touch-first; tap/select/drag/rotate/draw as defined by the mechanic.
- Provide a clear selected-state affordance.
- Support undo for non-timed strategic actions where practical.
- Avoid relying on tiny hit targets.
- Use haptics only as optional reinforcement, never as the sole feedback channel.

## 5. Level generation
**Approach:** Procedural grammar sequences

Generator contract:
- Input: generator version, seed, target difficulty, player progression band.
- Output: puzzle state, intended solution or validator certificate, metadata and fingerprint.
- Validate all constraints before presenting a level.
- Reject trivial, ambiguous, unsolvable and near-duplicate candidates.
- Retain a curated fallback level pack.
- Store seed and generator version with every attempt for reproducibility.

## 6. Difficulty progression
Use at least five bands: Intro, Easy, Standard, Advanced, Expert. Increase structural complexity gradually:
- Introduce one new rule at a time.
- Increase interactions/constraints only after comprehension is demonstrated.
- Reduce scaffolding gradually.
- Avoid making difficulty depend solely on shorter timers or larger boards.
- Track solve rate and abandonment by level band.

## 7. Scoring and feedback
Score correctness and objective completion first. Optional efficiency bonus may consider moves, hints or time only when those factors are central to the mechanic. Never penalise accessibility settings or slower play by default. Explain why a solution succeeded or failed.

## 8. Hints
Provide progressive hints:
- Hint 1: point to the relevant area or rule.
- Hint 2: reveal a relationship or next step.
- Hint 3: provide a near-solution scaffold.
Hints must not be required to access core progression. Rewarded ads may optionally grant a bonus hint, but the player must always be able to decline.

## 9. Accessibility
- Do not use colour as the only differentiator.
- Support reduced motion.
- Offer sound/haptics toggles.
- Use scalable text and clear contrast.
- Provide a non-timed mode unless timing is essential to the mechanic.
- Add alternative input affordances for drag/draw where practical.

## 10. Analytics events
`game_started`, `tutorial_step_seen`, `action_submitted`, `hint_requested`, `level_completed`, `level_failed`, `game_paused`, `game_exited`. Event payloads must exclude unnecessary personal data.

## 11. Acceptance criteria
- First-time player understands the goal without external explanation.
- At least one tutorial level teaches the mechanic.
- At least 50 fixed regression seeds pass the validator for procedural games.
- Success/failure states are deterministic.
- App pause/resume does not corrupt the board.
- Offline result persists locally.
- The game feels materially different from other games in the catalogue.
- Human originality review documents the distinct interaction grammar, level structure and asset provenance.

## 12. Originality guardrail
Do not copy the layouts, story text, level sequences, characters, art, UI or distinctive expression of any reference title. General puzzle principles are not owned by a single game, but implementation must be independently authored. Document comparisons and design decisions in `03_Game_Design_Documents/Originality_Review/`.
