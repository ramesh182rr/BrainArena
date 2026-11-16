from examples.number_maze_generator import generate, validate

def test_seed_is_deterministic():
    assert generate(1234) == generate(1234)

def test_generated_levels_validate():
    for seed in range(1000):
        for band in ("easy", "standard", "advanced", "expert"):
            assert validate(generate(seed, band))
