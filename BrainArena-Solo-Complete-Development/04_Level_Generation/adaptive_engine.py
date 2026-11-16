from dataclasses import dataclass
from typing import Iterable

@dataclass(frozen=True)
class GameStats:
    attempts: int
    solve_rate: float
    efficiency: float
    consistency: float
    hint_independence: float
    current_band: int
    recent_failures: int

def mastery(stats: GameStats) -> float:
    values = [stats.solve_rate, stats.efficiency, stats.consistency, stats.hint_independence]
    if any(v < 0 or v > 1 for v in values):
        raise ValueError("Normalised metrics must be between 0 and 1")
    return (0.55 * stats.solve_rate + 0.20 * stats.efficiency
            + 0.15 * stats.consistency + 0.10 * stats.hint_independence)

def next_band(stats: GameStats, min_attempts: int = 5,
              promote_at: float = 0.82, demote_failures: int = 4,
              max_band: int = 4) -> int:
    if stats.attempts < min_attempts:
        return stats.current_band
    score = mastery(stats)
    if score >= promote_at and stats.current_band < max_band:
        return stats.current_band + 1
    if stats.recent_failures >= demote_failures and stats.current_band > 0:
        return stats.current_band - 1
    return stats.current_band
