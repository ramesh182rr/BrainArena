from __future__ import annotations
from dataclasses import dataclass, asdict
from random import Random
from typing import List, Optional
import json

@dataclass(frozen=True)
class Gate:
    operation: str
    value: int

@dataclass(frozen=True)
class Level:
    seed: int
    start_value: int
    target_value: int
    gates: List[Gate]
    solution: List[int]
    difficulty: str

def apply(value: int, gate: Gate) -> Optional[int]:
    if gate.operation == "add":
        return value + gate.value
    if gate.operation == "subtract":
        return value - gate.value
    if gate.operation == "multiply":
        return value * gate.value
    if gate.operation == "divide":
        if gate.value == 0 or value % gate.value:
            return None
        return value // gate.value
    raise ValueError(f"Unknown operation: {gate.operation}")

def generate(seed: int, difficulty: str = "easy") -> Level:
    rng = Random(seed)
    size = {"easy": 3, "standard": 4, "advanced": 5, "expert": 6}[difficulty]
    start = rng.randint(4, 12)
    gates = []
    value = start
    solution = []
    ops = ["add", "subtract", "multiply"]
    for _ in range(size):
        op = rng.choice(ops)
        amount = rng.randint(1, 4)
        gate = Gate(op, amount)
        nxt = apply(value, gate)
        if nxt is None or nxt < 0 or nxt > 200:
            gate = Gate("add", rng.randint(1, 3))
            nxt = apply(value, gate)
        gates.append(gate)
        solution.append(len(gates) - 1)
        value = nxt
    return Level(seed, start, value, gates, solution, difficulty)

def validate(level: Level) -> bool:
    if not level.gates or len(level.solution) != len(level.gates):
        return False
    value = level.start_value
    used = set()
    for idx in level.solution:
        if idx < 0 or idx >= len(level.gates) or idx in used:
            return False
        used.add(idx)
        next_value = apply(value, level.gates[idx])
        if next_value is None:
            return False
        value = next_value
    return value == level.target_value and len(used) == len(level.gates)

if __name__ == "__main__":
    level = generate(seed=20261116, difficulty="standard")
    assert validate(level)
    print(json.dumps(asdict(level), indent=2))
