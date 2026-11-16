# Adaptive Difficulty & Daily Arena Recommendation

## Principles
- Personalise entertainment, not clinical cognitive assessment.
- Normalise within a game and difficulty band; do not compare raw seconds or scores across unrelated games.
- Maintain uncertainty until enough attempts exist.
- Balance comfort, stretch and novelty.
- Let the user override/skip recommendations.
- Never interpret one failure as a general weakness.

## Per-game performance
For each game/band, maintain:
- attempts, completions, recent solve rate
- median attempts/moves relative to expected band
- hint rate
- optional time percentile where time is meaningful
- recency and confidence
- recent difficulty transitions

A simple initial mastery estimate:
`mastery = 0.55 * solve_rate + 0.20 * efficiency_percentile + 0.15 * consistency + 0.10 * hint_independence`
All inputs are normalised 0..1 and weights are configurable. For games where time or hints are not meaningful, redistribute weights. Require a minimum sample count before changing difficulty.

## Difficulty adjustment
- Promote one band only after a rolling window meets a configured success threshold and confidence threshold.
- Demote only after repeated frustration signals (repeated failures/abandonment), not one failed attempt.
- Keep a manual "choose difficulty" override.
- Apply a cooldown to prevent oscillation.

## Daily Arena selection
Candidate score can combine:
- user preference
- game recency / anti-repeat
- content novelty
- target session length
- confidence-aware practice opportunity
- world variety
- game availability/offline readiness

Always include at least one comfortable choice and one novelty choice when candidate pool permits. Avoid selecting several games with nearly identical mechanic tags in one short session.
